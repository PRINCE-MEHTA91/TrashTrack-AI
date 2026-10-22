import { query, getClient } from "../config/database.js";

// Worker assignment configuration
export function getAssignmentConfig() {
  return {
    maxRadiusMeters: parseInt(process.env.MAX_ASSIGNMENT_RADIUS_METERS || "25000", 10),
    freshnessMinutes: parseInt(process.env.LOCATION_FRESHNESS_MINUTES || "120", 10),
    maxCapacity: parseInt(process.env.MAX_WORKLOAD_CAPACITY || "5", 10),
  };
}

// Finds nearest eligible worker using PostGIS spatial ranking and capacity checks
export async function findNearestEligibleWorker(dbClient, complaint, overrideConfig = {}) {
  const config = { ...getAssignmentConfig(), ...overrideConfig };
  const { latitude, longitude, municipality_id: muniId } = complaint;

  if (
    latitude === null || latitude === undefined ||
    longitude === null || longitude === undefined ||
    isNaN(latitude) || isNaN(longitude) ||
    latitude < -90 || latitude > 90 ||
    longitude < -180 || longitude > 180
  ) {
    return null;
  }

  const sql = `
    SELECT 
      u.id as worker_id,
      u.full_name,
      u.email,
      u.phone_number,
      u.municipality_id,
      m.name as municipality_name,
      ul.latitude as worker_lat,
      ul.longitude as worker_lng,
      ul.accuracy as worker_accuracy,
      ul.updated_at as location_updated_at,
      EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - ul.updated_at)) / 60 as location_age_minutes,
      ST_Distance(
        ST_SetSRID(ST_MakePoint(ul.longitude, ul.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography
      ) as distance_meters,
      (
        SELECT COUNT(*)::int 
        FROM complaints act 
        WHERE act.assigned_worker_id = u.id 
          AND act.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
      ) as current_workload
    FROM users u
    LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
    LEFT JOIN municipalities m ON m.id = u.municipality_id
    JOIN worker_sessions ws ON ws.worker_id = u.id AND ws.ended_at IS NULL AND ws.work_date = CURRENT_DATE
    JOIN user_locations ul ON ul.user_id = u.id
    WHERE u.role = 'worker'
      AND u.status = 'active'
      AND u.status NOT IN ('suspended', 'disabled', 'rejected')
      AND COALESCE(wa.status, CASE WHEN u.status = 'active' THEN 'APPROVED' ELSE 'PENDING_VERIFICATION' END) = 'APPROVED'
      AND COALESCE(wa.status, '') != 'REJECTED'
      AND u.availability_status = 'ACTIVE'
      -- Zone Authorization:
      AND (
        ($3::uuid IS NOT NULL AND (
          u.municipality_id = $3::uuid 
          OR EXISTS (
            SELECT 1 FROM municipalities mb 
            WHERE mb.id = u.municipality_id 
              AND (
                ST_Contains(mb.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
                OR ST_DWithin(mb.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $5)
              )
          )
        ))
        OR ($3::uuid IS NULL AND (
          u.municipality_id IS NULL
          OR EXISTS (
            SELECT 1 FROM municipalities mb 
            WHERE mb.id = u.municipality_id 
              AND (
                ST_Contains(mb.boundary, ST_SetSRID(ST_MakePoint($1, $2), 4326))
                OR ST_DWithin(mb.boundary::geography, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $5)
              )
          )
        ))
      )
      -- Location validity & freshness:
      AND ul.latitude IS NOT NULL
      AND ul.longitude IS NOT NULL
      AND ul.latitude BETWEEN -90 AND 90
      AND ul.longitude BETWEEN -180 AND 180
      AND ul.updated_at >= CURRENT_TIMESTAMP - ($4 || ' minutes')::interval
      -- Spatial distance within configurable maximum radius:
      AND ST_DWithin(
        ST_SetSRID(ST_MakePoint(ul.longitude, ul.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
        $5
      )
      -- Workload capacity:
      AND (
        SELECT COUNT(*) 
        FROM complaints act 
        WHERE act.assigned_worker_id = u.id 
          AND act.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
      ) < $6
      -- Exclude rejected workers:
      AND (cardinality($7::uuid[]) = 0 OR NOT (u.id = ANY($7::uuid[])))
    ORDER BY 
      distance_meters ASC,
      current_workload ASC,
      ul.updated_at DESC,
      u.id ASC
    LIMIT 1
  `;

  const excludedWorkerIds = Array.isArray(overrideConfig.excludedWorkerIds)
    ? overrideConfig.excludedWorkerIds.filter(Boolean)
    : [];

  const params = [
    longitude,
    latitude,
    muniId || null,
    config.freshnessMinutes,
    config.maxRadiusMeters,
    config.maxCapacity,
    excludedWorkerIds,
  ];

  const executor = dbClient?.query ? dbClient : { query };
  const res = await executor.query(sql, params);
  return res.rows[0] || null;
}

// Auto-assigns complaint to nearest worker with row-level locking
export async function assignComplaintToNearestWorker(complaintId, options = {}) {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Lock complaint row to prevent race conditions during concurrent submissions
    const compRes = await client.query(
      `SELECT id, citizen_id, title, status, assigned_worker_id, latitude, longitude, municipality_id, ward_id, rejected_worker_ids
       FROM complaints
       WHERE id = $1
       FOR UPDATE`,
      [complaintId]
    );

    if (compRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, reason: "NOT_FOUND", message: "Complaint not found." };
    }

    const complaint = compRes.rows[0];

    // Check if already assigned
    if (complaint.assigned_worker_id) {
      await client.query("ROLLBACK");
      return {
        success: true,
        assigned: true,
        already_assigned: true,
        complaint,
        message: "Complaint is already assigned.",
      };
    }

    // Terminal statuses cannot be assigned
    if (["RESOLVED", "COMPLETED", "CLOSED", "REJECTED"].includes(complaint.status)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        reason: "TERMINAL_STATUS",
        message: `Cannot assign complaint with terminal status '${complaint.status}'.`,
      };
    }

    // Coordinates check
    if (
      complaint.latitude === null || complaint.latitude === undefined ||
      complaint.longitude === null || complaint.longitude === undefined ||
      isNaN(complaint.latitude) || isNaN(complaint.longitude) ||
      complaint.latitude < -90 || complaint.latitude > 90 ||
      complaint.longitude < -180 || complaint.longitude > 180
    ) {
      // Keep saved as unassigned without spatial auto-assignment
      await client.query(
        `UPDATE complaints
         SET assigned_worker_id = NULL,
             assignment_mode = 'NONE',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [complaintId]
      );

      await client.query(
        `INSERT INTO complaint_assignment_logs 
           (complaint_id, worker_id, assigned_by, distance_meters, status, notes)
         VALUES 
           ($1, NULL, 'SYSTEM_AUTO', NULL, 'UNASSIGNED', 'Invalid or missing GPS coordinates for automatic spatial assignment.')`,
        [complaintId]
      );

      await client.query("COMMIT");
      return {
        success: true,
        assigned: false,
        reason: "INVALID_COORDINATES",
        message: "Complaint coordinates are invalid or missing. Saved as unassigned.",
      };
    }

    // 2. Query best eligible candidate worker excluding already rejected workers
    const combinedExcluded = Array.from(new Set([
      ...(complaint.rejected_worker_ids || []),
      ...(options.excludedWorkerIds || []),
    ])).filter(Boolean);

    const candidate = await findNearestEligibleWorker(client, complaint, {
      ...options,
      excludedWorkerIds: combinedExcluded,
    });

    if (!candidate) {
      // Safe fallback: keep complaint saved as SUBMITTED (unassigned) for Admin action
      await client.query(
        `UPDATE complaints
         SET assigned_worker_id = NULL,
             assignment_mode = 'NONE',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [complaintId]
      );

      await client.query(
        `INSERT INTO complaint_assignment_logs 
           (complaint_id, worker_id, assigned_by, distance_meters, status, notes)
         VALUES 
           ($1, NULL, 'SYSTEM_AUTO', NULL, 'UNASSIGNED', 'No eligible worker available within radius/capacity/zone.')`,
        [complaintId]
      );

      await client.query("COMMIT");
      return {
        success: true,
        assigned: false,
        reason: "NO_ELIGIBLE_WORKER",
        message: "No eligible worker currently available in zone. Complaint saved as unassigned for Admin review.",
        complaint,
      };
    }

    // 3. Assign complaint offer to nearest eligible worker
    const roundedDistance = Math.round(candidate.distance_meters);
    const expiryMinutes = parseInt(process.env.ASSIGNMENT_OFFER_EXPIRY_MINUTES || "15", 10);
    const updateRes = await client.query(
      `UPDATE complaints
       SET assigned_worker_id = $1,
           status = 'PENDING',
           worker_response = 'PENDING_ACCEPTANCE',
           worker_response_at = NULL,
           offer_expires_at = CURRENT_TIMESTAMP + ($4 || ' minutes')::interval,
           assigned_at = CURRENT_TIMESTAMP,
           assignment_distance_meters = $2,
           assignment_mode = 'AUTO_NEAREST',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [candidate.worker_id, roundedDistance, complaintId, expiryMinutes]
    );

    // 4. Record audit log
    await client.query(
      `INSERT INTO complaint_assignment_logs 
         (complaint_id, worker_id, assigned_by, distance_meters, status, notes)
       VALUES 
         ($1, $2, 'SYSTEM_AUTO', $3, 'OFFERED', $4)`,
      [
        complaintId,
        candidate.worker_id,
        roundedDistance,
        `Auto-assigned offer to nearest eligible worker ${candidate.full_name} (${roundedDistance}m away, active tasks: ${candidate.current_workload})`,
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      assigned: true,
      complaint: updateRes.rows[0],
      worker: {
        id: candidate.worker_id,
        full_name: candidate.full_name,
        email: candidate.email,
        phone_number: candidate.phone_number,
        municipality_id: candidate.municipality_id,
        municipality_name: candidate.municipality_name,
      },
      distance_meters: roundedDistance,
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

// Admin manual assignment / reassignment
export async function manualAssignComplaint(adminId, complaintId, targetWorkerId, notes = "") {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // 1. Verify Admin authority
    const adminRes = await client.query(
      `SELECT id, role, full_name, municipality_id FROM users WHERE id = $1`,
      [adminId]
    );
    if (adminRes.rows.length === 0 || adminRes.rows[0].role !== "admin") {
      await client.query("ROLLBACK");
      return { success: false, status: 403, message: "Forbidden: Admin access required." };
    }
    const admin = adminRes.rows[0];

    // 2. Lock complaint
    const compRes = await client.query(
      `SELECT id, status, assigned_worker_id, municipality_id, latitude, longitude
       FROM complaints
       WHERE id = $1
       FOR UPDATE`,
      [complaintId]
    );
    if (compRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, status: 404, message: "Complaint not found." };
    }
    const complaint = compRes.rows[0];

    if (["RESOLVED", "COMPLETED", "CLOSED", "REJECTED"].includes(complaint.status)) {
      await client.query("ROLLBACK");
      return { success: false, status: 400, message: "Cannot assign a resolved or closed complaint." };
    }

    // 3. Verify target worker
    const workerRes = await client.query(
      `SELECT u.id, u.full_name, u.email, u.role, u.status, u.municipality_id,
              COALESCE(wa.status, CASE WHEN u.status = 'active' THEN 'APPROVED' ELSE 'PENDING_VERIFICATION' END) as verification_status,
              ul.latitude, ul.longitude
       FROM users u
       LEFT JOIN worker_approvals wa ON wa.worker_id = u.id
       LEFT JOIN user_locations ul ON ul.user_id = u.id
       WHERE u.id = $1 AND u.role = 'worker'`,
      [targetWorkerId]
    );
    if (workerRes.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, status: 404, message: "Worker not found." };
    }
    const worker = workerRes.rows[0];

    if (worker.status !== "active" || worker.verification_status !== "APPROVED") {
      await client.query("ROLLBACK");
      return { success: false, status: 400, message: "Worker is not verified or active." };
    }

    // Zone jurisdiction check:
    // If admin has a municipality, ensure either complaint or worker belongs to that municipality
    if (admin.municipality_id) {
      if (complaint.municipality_id && complaint.municipality_id !== admin.municipality_id) {
        await client.query("ROLLBACK");
        return { success: false, status: 403, message: "Forbidden: Complaint belongs to another jurisdiction." };
      }
      if (worker.municipality_id && worker.municipality_id !== admin.municipality_id) {
        await client.query("ROLLBACK");
        return { success: false, status: 403, message: "Forbidden: Worker belongs to another jurisdiction." };
      }
    }

    // Calculate distance if both locations exist
    let distanceMeters = null;
    if (complaint.latitude && complaint.longitude && worker.latitude && worker.longitude) {
      const distRes = await client.query(
        `SELECT ST_Distance(
           ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography,
           ST_SetSRID(ST_MakePoint($3, $4), 4326)::geography
         ) as distance`,
        [worker.longitude, worker.latitude, complaint.longitude, complaint.latitude]
      );
      distanceMeters = Math.round(Number(distRes.rows[0]?.distance) || 0);
    }

    const previousWorkerId = complaint.assigned_worker_id;
    const isReassignment = Boolean(previousWorkerId && previousWorkerId !== targetWorkerId);

    // 4. Update complaint assignment offer
    const expiryMinutes = parseInt(process.env.ASSIGNMENT_OFFER_EXPIRY_MINUTES || "15", 10);
    const updatedRes = await client.query(
      `UPDATE complaints
       SET assigned_worker_id = $1,
           status = 'PENDING',
           worker_response = 'PENDING_ACCEPTANCE',
           worker_response_at = NULL,
           offer_expires_at = CURRENT_TIMESTAMP + ($4 || ' minutes')::interval,
           assigned_at = CURRENT_TIMESTAMP,
           assignment_distance_meters = $2,
           assignment_mode = 'MANUAL',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [targetWorkerId, distanceMeters, complaintId, expiryMinutes]
    );

    // 5. Audit log
    await client.query(
      `INSERT INTO complaint_assignment_logs 
         (complaint_id, worker_id, assigned_by, admin_id, distance_meters, status, notes)
       VALUES 
         ($1, $2, 'ADMIN', $3, $4, $5, $6)`,
      [
        complaintId,
        targetWorkerId,
        adminId,
        distanceMeters,
        isReassignment ? "REASSIGNED" : "OFFERED",
        notes || (isReassignment ? `Reassigned by admin ${admin.full_name}` : `Manually assigned offer by admin ${admin.full_name}`),
      ]
    );

    await client.query("COMMIT");

    return {
      success: true,
      message: `Complaint successfully assigned to ${worker.full_name}.`,
      complaint: updatedRes.rows[0],
      worker: {
        id: worker.id,
        full_name: worker.full_name,
        email: worker.email,
      },
      distance_meters: distanceMeters,
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

// Retrieve assignment audit trail
export async function getComplaintAssignmentLogs(complaintId) {
  const res = await query(
    `SELECT 
       l.id,
       l.complaint_id,
       l.worker_id,
       w.full_name as worker_name,
       l.assigned_by,
       l.admin_id,
       adm.full_name as admin_name,
       l.distance_meters,
       l.status,
       l.notes,
       l.created_at
     FROM complaint_assignment_logs l
     LEFT JOIN users w ON w.id = l.worker_id
     LEFT JOIN users adm ON adm.id = l.admin_id
     WHERE l.complaint_id = $1
     ORDER BY l.created_at DESC`,
    [complaintId]
  );
  return res.rows;
}

// Worker accepts task offer (checks ownership, pending state, and expiry)
export async function acceptWorkerTaskAssignment(workerId, complaintId) {
  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Lock complaint row
    const res = await client.query(
      `SELECT id, status, assigned_worker_id, worker_response, offer_expires_at, title
       FROM complaints
       WHERE id = $1
       FOR UPDATE`,
      [complaintId]
    );

    if (res.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, status: 404, message: "Task not found." };
    }

    const complaint = res.rows[0];

    // Ownership check: must belong to authenticated worker
    if (complaint.assigned_worker_id !== workerId) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 403,
        message: "Forbidden: You are not authorized to accept this task.",
      };
    }

    // Check if already accepted
    if (complaint.worker_response === "ACCEPTED") {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 409,
        message: "Task has already been accepted.",
      };
    }

    // Check if previously rejected
    if (complaint.worker_response === "REJECTED") {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 400,
        message: "Cannot accept a task that has been rejected.",
      };
    }

    // Check expiry
    if (complaint.offer_expires_at && new Date(complaint.offer_expires_at) < new Date()) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 410,
        message: "Task assignment offer has expired.",
      };
    }

    // Update complaint to ACCEPTED
    const updateRes = await client.query(
      `UPDATE complaints
       SET worker_response = 'ACCEPTED',
           worker_response_at = CURRENT_TIMESTAMP,
           status = 'PENDING',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING *`,
      [complaintId]
    );

    // Record audit log
    await client.query(
      `INSERT INTO complaint_assignment_logs 
         (complaint_id, worker_id, assigned_by, status, notes)
       VALUES 
         ($1, $2, 'WORKER', 'ACCEPTED', 'Worker accepted task assignment offer.')`,
      [complaintId, workerId]
    );

    await client.query("COMMIT");

    return {
      success: true,
      status: 200,
      message: "Task accepted successfully!",
      task: updateRes.rows[0],
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

// Worker rejects task offer with mandatory reason and triggers reassignment
export async function rejectWorkerTaskAssignment(workerId, complaintId, reason, explanation = "") {
  // Validate reason
  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return {
      success: false,
      status: 400,
      message: "A valid rejection reason is required.",
    };
  }

  const trimmedReason = reason.trim();
  const trimmedExpl = (explanation || "").trim();

  // If "Other" is chosen, require a non-empty written explanation
  if (trimmedReason === "Other" || trimmedReason.toLowerCase().startsWith("other")) {
    if (!trimmedExpl && !trimmedReason.includes(":")) {
      return {
        success: false,
        status: 400,
        message: "Please provide a written explanation when selecting 'Other'.",
      };
    }
  }

  const finalReason = trimmedReason === "Other"
    ? `Other: ${trimmedExpl}`
    : trimmedReason;

  const client = await getClient();

  try {
    await client.query("BEGIN");

    // Lock complaint row
    const res = await client.query(
      `SELECT id, status, assigned_worker_id, worker_response, rejected_worker_ids
       FROM complaints
       WHERE id = $1
       FOR UPDATE`,
      [complaintId]
    );

    if (res.rows.length === 0) {
      await client.query("ROLLBACK");
      return { success: false, status: 404, message: "Task not found." };
    }

    const complaint = res.rows[0];

    // Ownership check
    if (complaint.assigned_worker_id !== workerId) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 403,
        message: "Forbidden: You are not authorized to reject this task offer.",
      };
    }

    // Cannot reject if already in progress or completed
    if (["IN_PROGRESS", "RESOLVED", "COMPLETED", "CLOSED", "VERIFIED"].includes(complaint.status)) {
      await client.query("ROLLBACK");
      return {
        success: false,
        status: 400,
        message: "Cannot reject a task that is already in progress or completed.",
      };
    }

    // Save rejection in PostgreSQL, unassign current worker, and append worker to rejected_worker_ids
    const updateRes = await client.query(
      `UPDATE complaints
       SET assigned_worker_id = NULL,
           worker_response = 'REJECTED',
           worker_response_at = CURRENT_TIMESTAMP,
           rejected_at = CURRENT_TIMESTAMP,
           rejection_reason = $1,
           rejected_worker_ids = array_append(COALESCE(rejected_worker_ids, '{}'), $2::uuid),
           assignment_mode = 'NONE',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3
       RETURNING *`,
      [finalReason, workerId, complaintId]
    );

    // Record audit log
    await client.query(
      `INSERT INTO complaint_assignment_logs 
         (complaint_id, worker_id, assigned_by, status, notes)
       VALUES 
         ($1, $2, 'WORKER', 'REJECTED', $3)`,
      [complaintId, workerId, `Worker rejected task offer. Reason: ${finalReason}`]
    );

    await client.query("COMMIT");

    // Immediately trigger reassignment workflow excluding all rejected workers
    let reassignRes = null;
    try {
      reassignRes = await assignComplaintToNearestWorker(complaintId);
    } catch (reassignErr) {
      console.error("Reassignment after rejection error:", reassignErr);
    }

    return {
      success: true,
      status: 200,
      message: "Task offer rejected successfully.",
      rejection_reason: finalReason,
      reassigned: Boolean(reassignRes?.assigned),
      next_worker: reassignRes?.worker || null,
      complaint: updateRes.rows[0],
    };
  } catch (err) {
    try { await client.query("ROLLBACK"); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

