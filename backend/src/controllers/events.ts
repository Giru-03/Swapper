import { Request, Response } from 'express';
import { query } from '../models';

export const getEvents = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await query('SELECT * FROM events WHERE user_id = $1', [userId]);
  res.json(result.rows);
};

export const createEvent = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { title, startTime, endTime, status = 'BUSY' } = req.body;
  const result = await query(
    'INSERT INTO events (user_id, title, start_time, end_time, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [userId, title, startTime, endTime, status]
  );
  res.json(result.rows[0]);
};

export const updateEvent = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  const { title, startTime, endTime, status } = req.body;

  // Fetch existing event so we can allow partial updates
  const existingRes = await query('SELECT * FROM events WHERE id = $1 AND user_id = $2', [id, userId]);
  if (!existingRes.rows.length) return res.status(404).json({ error: 'Event not found' });
  const existing = existingRes.rows[0];

  const newTitle = title ?? existing.title;
  const newStart = startTime ?? existing.start_time;
  const newEnd = endTime ?? existing.end_time;
  const newStatus = status ?? existing.status;

  const result = await query(
    'UPDATE events SET title = $1, start_time = $2, end_time = $3, status = $4 WHERE id = $5 AND user_id = $6 RETURNING *',
    [newTitle, newStart, newEnd, newStatus, id, userId]
  );

  if (!result.rows.length) return res.status(404).json({ error: 'Event not found' });
  res.json(result.rows[0]);
};

export const deleteEvent = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const { id } = req.params;
  await query('DELETE FROM events WHERE id = $1 AND user_id = $2', [id, userId]);
  res.json({ message: 'Event deleted' });
};