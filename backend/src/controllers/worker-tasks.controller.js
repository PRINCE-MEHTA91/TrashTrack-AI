import { query } from "../config/database.js";
import { z } from "zod";
import {
  acceptWorkerTaskAssignment,
  rejectWorkerTaskAssignment,
} from "../services/assignment.service.js";

// Live task counts by category
export async function getWorkerTaskCounts(workerId) {
  const res = await query(
    `SELECT
       COUNT(*) FILTER (WHERE status NOT IN ('REJECTED'))                                          AS total_all,
       COUNT(*) FILTER (WHERE status IN ('PENDING', 'SUBMITTED', 'ASSIGNED'))                       AS total_pending,
       COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')                                               AS total_in_progress,
       COUNT(*) FILTER (WHERE status IN ('RESOLVED', 'COMPLETED', 'CLOSED', 'VERIFIED'))           AS total_completed
     FROM complaints
     WHERE assigned_worker_id = $1`,
    [workerId]
  );
  const row = res.rows[0] || {};
  return {
    all: Number(row.total_all) || 0,
    pending: Number(row.total_pending) || 0,
    in_progress: Number(row.total_in_progress) || 0,
    completed: Number(row.total_completed) || 0,
  };
}

// List assigned worker tasks with tab and search filters
export const getWorkerTasks = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const {
      tab = "all",
      search = "",
      severity,
      waste_type,
      page = "1",
      limit = "20",
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    // 1. Fetch live summary counts across all 4 sections
    const counts = await getWorkerTaskCounts(workerId);

    // 2. Build dynamic filter query for the selected tab & search criteria
    const conditions = ["c.assigned_worker_id = $1"];
    const params = [workerId];

    // Status filter by tab
    if (tab === "pending") {
      conditions.push(`c.status IN ('PENDING', 'SUBMITTED', 'ASSIGNED')`);
    } else if (tab === "in_progress") {
      conditions.push(`c.status = 'IN_PROGRESS'`);
    } else if (tab === "completed") {
      conditions.push(`c.status IN ('RESOLVED', 'COMPLETED', 'CLOSED', 'VERIFIED')`);
    } else {
      conditions.push(`c.status NOT IN ('REJECTED')`);
    }

    // Search filter
    if (search && search.trim() !== "") {
      params.push(`%${search.trim()}%`);
      conditions.push(`(c.title ILIKE $${params.length} OR c.description ILIKE $${params.length} OR c.address ILIKE $${params.length})`);
    }

    // Priority / severity filter
    if (severity && ["LOW", "MEDIUM", "HIGH"].includes(severity.toUpperCase())) {
      params.push(severity.toUpperCase());
      conditions.push(`c.severity = $${params.length}`);
    }

    // Waste type filter
    if (waste_type && ["ORGANIC", "PLASTIC", "HAZARDOUS", "BULK", "OTHER"].includes(waste_type.toUpperCase())) {
      params.push(waste_type.toUpperCase());
      conditions.push(`c.waste_type = $${params.length}`);
    }

    const whereClause = conditions.join(" AND ");

    // Count filtered records for pagination
    const countRes = await query(
      `SELECT COUNT(*) AS total FROM complaints c WHERE ${whereClause}`,
      params
    );
    const totalFiltered = Number(countRes.rows[0]?.total) || 0;

    // Fetch page of tasks with joined municipality and ward names
    const dataParams = [...params, limitNum, offset];
    const dataSql = `
      SELECT
        c.id,
        c.citizen_id,
        c.title,
        c.description,
        c.waste_type,
        c.severity,
        c.latitude,
        c.longitude,
        c.accuracy,
        c.address,
        c.image_url,
        c.status,
        c.assigned_worker_id,
        c.resolution_note,
        c.resolution_image_url,
        c.resolved_at,
        c.assigned_at,
        c.assignment_distance_meters,
        c.assignment_mode,
        c.worker_response,
        c.worker_response_at,
        c.rejection_reason,
        c.offer_expires_at,
        c.created_at,

        c.updated_at,
        m.name AS municipality_name,
        m.district AS municipality_district,
        w.name AS ward_name,
        w.ward_number,
        u.full_name AS citizen_name,
        u.phone_number AS citizen_phone
      FROM complaints c
      LEFT JOIN municipalities m ON m.id = c.municipality_id
      LEFT JOIN wards w ON w.id = c.ward_id
      LEFT JOIN users u ON u.id = c.citizen_id
      WHERE ${whereClause}
      ORDER BY
        CASE
          WHEN c.status = 'IN_PROGRESS' THEN 1
          WHEN c.status IN ('PENDING', 'SUBMITTED', 'ASSIGNED') THEN 2
          ELSE 3
        END,
        c.updated_at DESC,
        c.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const tasksRes = await query(dataSql, dataParams);

    res.json({
      success: true,
      counts,
      tasks: tasksRes.rows,
      pagination: {
        total: totalFiltered,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(totalFiltered / limitNum) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Live worker task counts summary
export const getWorkerTasksSummary = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const counts = await getWorkerTaskCounts(workerId);
    res.json({ success: true, counts });
  } catch (err) {
    next(err);
  }
};

// Single task detail with ownership check
export const getWorkerTaskById = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const { id } = req.params;

    const resQuery = await query(
      `SELECT
        c.id,
        c.citizen_id,
        c.title,
        c.description,
        c.waste_type,
        c.severity,
        c.latitude,
        c.longitude,
        c.accuracy,
        c.address,
        c.image_url,
        c.status,
        c.assigned_worker_id,
        c.resolution_note,
        c.resolution_image_url,
        c.resolved_at,
        c.assigned_at,
        c.assignment_distance_meters,
        c.assignment_mode,
        c.worker_response,
        c.worker_response_at,
        c.rejection_reason,
        c.offer_expires_at,
        c.created_at,

        c.updated_at,
        m.name AS municipality_name,
        m.district AS municipality_district,
        w.name AS ward_name,
        w.ward_number,
        u.full_name AS citizen_name,
        u.phone_number AS citizen_phone
      FROM complaints c
      LEFT JOIN municipalities m ON m.id = c.municipality_id
      LEFT JOIN wards w ON w.id = c.ward_id
      LEFT JOIN users u ON u.id = c.citizen_id
      WHERE c.id = $1`,
      [id]
    );

    if (resQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = resQuery.rows[0];

    // Authorization: only the assigned worker may access this task
    if (task.assigned_worker_id !== workerId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view this task.",
      });
    }

    res.json({ success: true, task });
  } catch (err) {
    next(err);
  }
};

// Start task: transitions to IN_PROGRESS
export const startWorkerTask = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const { id } = req.params;

    // Check task existence and ownership
    const checkRes = await query(
      `SELECT id, status, assigned_worker_id FROM complaints WHERE id = $1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = checkRes.rows[0];

    if (task.assigned_worker_id !== workerId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not assigned to this task.",
      });
    }

    if (task.status === "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "Task is already in progress.",
      });
    }

    if (["RESOLVED", "COMPLETED", "CLOSED", "VERIFIED"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: "Cannot start a task that has already been completed.",
      });
    }

    if (!["PENDING", "SUBMITTED", "ASSIGNED"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot start task with current status: ${task.status}`,
      });
    }

    // Transition to IN_PROGRESS (and mark accepted if still pending)
    const updateRes = await query(
      `UPDATE complaints
       SET status = 'IN_PROGRESS',
           worker_response = 'ACCEPTED',
           worker_response_at = COALESCE(worker_response_at, CURRENT_TIMESTAMP),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND assigned_worker_id = $2
       RETURNING *`,
      [id, workerId]
    );

    const counts = await getWorkerTaskCounts(workerId);

    res.json({
      success: true,
      message: "Task started successfully and moved to In Progress.",
      task: updateRes.rows[0],
      counts,
    });
  } catch (err) {
    next(err);
  }
};

// Update progress note
const progressSchema = z.object({
  note: z.string().min(2, "Progress note must be at least 2 characters."),
});

export const updateTaskProgress = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const { id } = req.params;
    const parsed = progressSchema.parse(req.body);

    const checkRes = await query(
      `SELECT id, status, assigned_worker_id, resolution_note FROM complaints WHERE id = $1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = checkRes.rows[0];

    if (task.assigned_worker_id !== workerId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not assigned to this task.",
      });
    }

    if (task.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "Progress notes can only be updated for In Progress tasks.",
      });
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const appendedNote = task.resolution_note
      ? `${task.resolution_note}\n[${timestamp}] ${parsed.note}`
      : `[${timestamp}] ${parsed.note}`;

    const updateRes = await query(
      `UPDATE complaints
       SET resolution_note = $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND assigned_worker_id = $3
       RETURNING *`,
      [appendedNote, id, workerId]
    );

    res.json({
      success: true,
      message: "Progress updated successfully.",
      task: updateRes.rows[0],
    });
  } catch (err) {
    if (err instanceof z.ZodError || err.name === "ZodError") {
      const msg = err.issues?.[0]?.message || err.errors?.[0]?.message || "Validation error";
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

// Complete task: transitions to RESOLVED with evidence
const completeSchema = z.object({
  resolution_note: z.string().min(3, "Please provide a completion note explaining the resolution (at least 3 characters)."),
  resolution_image_url: z.string().optional().nullable(),
});

export const completeWorkerTask = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const { id } = req.params;
    const parsed = completeSchema.parse(req.body);

    const checkRes = await query(
      `SELECT id, status, assigned_worker_id, resolution_note FROM complaints WHERE id = $1`,
      [id]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = checkRes.rows[0];

    if (task.assigned_worker_id !== workerId) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not assigned to this task.",
      });
    }

    if (["RESOLVED", "COMPLETED", "CLOSED", "VERIFIED"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: "Task is already marked as completed.",
      });
    }

    if (task.status !== "IN_PROGRESS") {
      return res.status(400).json({
        success: false,
        message: "Only In Progress tasks can be marked as completed. Please start the task first.",
      });
    }

    // Combine any earlier progress notes with the final completion note
    const finalNote = task.resolution_note
      ? `${task.resolution_note}\n[Completed] ${parsed.resolution_note}`
      : parsed.resolution_note;

    const updateRes = await query(
      `UPDATE complaints
       SET status = 'RESOLVED',
           resolution_note = $1,
           resolution_image_url = $2,
           resolved_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND assigned_worker_id = $4
       RETURNING *`,
      [finalNote, parsed.resolution_image_url || null, id, workerId]
    );

    const counts = await getWorkerTaskCounts(workerId);

    res.json({
      success: true,
      message: "Task successfully marked as completed!",
      task: updateRes.rows[0],
      counts,
    });
  } catch (err) {
    if (err instanceof z.ZodError || err.name === "ZodError") {
      const msg = err.issues?.[0]?.message || err.errors?.[0]?.message || "Validation error";
      return res.status(400).json({ success: false, message: msg });
    }
    next(err);
  }
};

// Claim unassigned task in worker zone
export const claimWorkerTask = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const { id } = req.params;

    // Check worker verification status
    const workerRes = await query(
      `SELECT id, role, status, municipality_id FROM users WHERE id = $1`,
      [workerId]
    );
    const worker = workerRes.rows[0];
    if (!worker || worker.role !== "worker") {
      return res.status(403).json({ success: false, message: "Forbidden: Worker access required." });
    }

    // Verify task is unassigned
    const taskRes = await query(
      `SELECT id, status, assigned_worker_id, municipality_id FROM complaints WHERE id = $1`,
      [id]
    );
    if (taskRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const task = taskRes.rows[0];
    if (task.assigned_worker_id) {
      return res.status(400).json({ success: false, message: "This task has already been assigned to another worker." });
    }

    if (["RESOLVED", "COMPLETED", "CLOSED", "REJECTED"].includes(task.status)) {
      return res.status(400).json({ success: false, message: "This complaint is already closed or resolved." });
    }

    // Zone check: Worker cannot claim task outside their assigned municipality
    if (worker.municipality_id && task.municipality_id && task.municipality_id !== worker.municipality_id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You cannot claim tasks outside your assigned municipality zone.",
      });
    }

    // Claim the task
    const updateRes = await query(
      `UPDATE complaints
       SET assigned_worker_id = $1,
           status = 'PENDING',
           assigned_at = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND assigned_worker_id IS NULL
       RETURNING *`,
      [workerId, id]
    );

    if (updateRes.rows.length === 0) {
      return res.status(409).json({ success: false, message: "Task was claimed by another worker just now." });
    }

    const counts = await getWorkerTaskCounts(workerId);

    res.json({
      success: true,
      message: "Task claimed and added to your assigned pending tasks.",
      task: updateRes.rows[0],
      counts,
    });
  } catch (err) {
    next(err);
  }
};

// Fetch pending task assignment offers for the authenticated worker
export const getPendingOffers = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const result = await query(
      `SELECT
        c.id,
        c.citizen_id,
        c.title,
        c.description,
        c.waste_type,
        c.severity,
        c.latitude,
        c.longitude,
        c.accuracy,
        c.address,
        c.image_url,
        c.status,
        c.assigned_worker_id,
        c.assigned_at,
        c.assignment_distance_meters,
        c.assignment_mode,
        c.worker_response,
        c.offer_expires_at,
        c.created_at,
        m.name AS municipality_name,
        w.name AS ward_name
       FROM complaints c
       LEFT JOIN municipalities m ON m.id = c.municipality_id
       LEFT JOIN wards w ON w.id = c.ward_id
       WHERE c.assigned_worker_id = $1
         AND c.worker_response = 'PENDING_ACCEPTANCE'
         AND (c.offer_expires_at IS NULL OR c.offer_expires_at > CURRENT_TIMESTAMP)
         AND c.status NOT IN ('RESOLVED', 'COMPLETED', 'CLOSED', 'REJECTED')
       ORDER BY c.assigned_at DESC`,
      [workerId]
    );

    res.json({
      success: true,
      offers: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// Accept assigned task offer
export const acceptTaskOffer = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const { id } = req.params;

    const result = await acceptWorkerTaskAssignment(workerId, id);
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    const counts = await getWorkerTaskCounts(workerId);
    return res.json({
      ...result,
      counts,
    });
  } catch (err) {
    next(err);
  }
};

// Reject assigned task offer with mandatory reason
const rejectOfferSchema = z.object({
  reason: z.string({ required_error: "Rejection reason is required." })
    .trim()
    .min(1, "Rejection reason cannot be empty or whitespace."),
  explanation: z.string().optional().nullable(),
});

export const rejectTaskOffer = async (req, res, next) => {
  try {
    const workerId = req.user.userId;
    const { id } = req.params;

    const parsed = rejectOfferSchema.safeParse(req.body);
    if (!parsed.success) {
      const msg = parsed.error.issues?.[0]?.message || "Validation error.";
      return res.status(400).json({ success: false, message: msg });
    }

    const { reason, explanation } = parsed.data;

    if (reason === "Other" || reason.toLowerCase().startsWith("other")) {
      if (!explanation || !explanation.trim()) {
        return res.status(400).json({
          success: false,
          message: "Please provide a written explanation when selecting 'Other'.",
        });
      }
    }

    const result = await rejectWorkerTaskAssignment(workerId, id, reason, explanation);
    if (!result.success) {
      return res.status(result.status || 400).json(result);
    }

    const counts = await getWorkerTaskCounts(workerId);
    return res.json({
      ...result,
      counts,
    });
  } catch (err) {
    next(err);
  }
};

