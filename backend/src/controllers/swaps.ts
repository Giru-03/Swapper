import { Request, Response } from 'express';
import { query, getClient } from '../models';

export const getSwappableSlots = async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await query(
    'SELECT e.*, u.name AS owner_name FROM events e JOIN users u ON e.user_id = u.id WHERE e.status = $1 AND e.user_id != $2',
    ['SWAPPABLE', userId]
  );
  res.json(result.rows);
};

export const createSwapRequest = async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const requesterId = (req as any).user.id;
    const { mySlotId, theirSlotId } = req.body;

    await client.query('BEGIN');

    // Verify both slots are SWAPPABLE and belong to the correct users
    const mySlotRes = await client.query('SELECT * FROM events WHERE id = $1 AND user_id = $2 AND status = $3 FOR UPDATE', [mySlotId, requesterId, 'SWAPPABLE']);
    const theirSlotRes = await client.query('SELECT * FROM events WHERE id = $1 AND status = $2 FOR UPDATE', [theirSlotId, 'SWAPPABLE']);

    if (!mySlotRes.rows.length || !theirSlotRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid slots' });
    }

    const responderId = theirSlotRes.rows[0].user_id;

    // Create request (status defaults to PENDING)
    const insertRes = await client.query(
      'INSERT INTO swap_requests (requester_id, responder_id, requester_slot_id, responder_slot_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [requesterId, responderId, mySlotId, theirSlotId]
    );

    // Set to SWAP_PENDING for both slots
    await client.query('UPDATE events SET status = $1 WHERE id = $2 OR id = $3', ['SWAP_PENDING', mySlotId, theirSlotId]);

    await client.query('COMMIT');
    // Emit real-time notification to the responder (and optionally to the requester)
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${responderId}`).emit('swap_request_created', insertRes.rows[0]);
        io.to(`user:${requesterId}`).emit('swap_request_created_ack', insertRes.rows[0]);
        console.log(`Emitted swap_request_created to user:${responderId} and ack to user:${requesterId}`);
      }
    } catch (emitErr) {
      console.error('createSwapRequest emit error:', emitErr);
    }

    res.json(insertRes.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createSwapRequest error:', err);
    res.status(500).json({ error: 'Failed to create swap request' });
  } finally {
    client.release();
  }
};

export const respondToSwap = async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const responderId = (req as any).user.id;
    const { requestId } = req.params;
    const { accept } = req.body;

    await client.query('BEGIN');

    const reqRes = await client.query(
      'SELECT * FROM swap_requests WHERE id = $1 AND responder_id = $2 AND status = $3 FOR UPDATE',
      [requestId, responderId, 'PENDING']
    );

    if (!reqRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const requestRow = reqRes.rows[0];
    const requesterSlotId = requestRow.requester_slot_id;
    const responderSlotId = requestRow.responder_slot_id;

    if (!accept) {
      // Reject: set swap_request status and reset events to SWAPPABLE
      await client.query('UPDATE swap_requests SET status = $1 WHERE id = $2', ['REJECTED', requestId]);
      await client.query('UPDATE events SET status = $1 WHERE id = $2 OR id = $3', ['SWAPPABLE', requesterSlotId, responderSlotId]);
      await client.query('COMMIT');
      // Emit update to both users
      try {
        const io = req.app.get('io');
        if (io) {
          io.to(`user:${requestRow.requester_id}`).emit('swap_request_updated', { id: requestId, status: 'REJECTED' });
          io.to(`user:${responderId}`).emit('swap_request_updated', { id: requestId, status: 'REJECTED' });
          console.log(`Emitted swap_request_updated(REJECTED) for request ${requestId} to users ${requestRow.requester_id} and ${responderId}`);
        }
      } catch (emitErr) {
        console.error('respondToSwap(reject) emit error:', emitErr);
      }
      return res.json({ message: 'Rejected' });
    }

    // Accept: Swap owners atomically
    // Responder gets requester's slot
    await client.query('UPDATE events SET user_id = $1 WHERE id = $2', [responderId, requesterSlotId]);
    // Requester gets responder's slot
    await client.query('UPDATE events SET user_id = $1 WHERE id = $2', [requestRow.requester_id, responderSlotId]);

    // Set statuses back to BUSY
    await client.query('UPDATE events SET status = $1 WHERE id = $2 OR id = $3', ['BUSY', requesterSlotId, responderSlotId]);

    // Mark request accepted
    await client.query('UPDATE swap_requests SET status = $1 WHERE id = $2', ['ACCEPTED', requestId]);

    await client.query('COMMIT');
    // Emit update to both users about acceptance and changed events
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${requestRow.requester_id}`).emit('swap_request_updated', { id: requestId, status: 'ACCEPTED' });
        io.to(`user:${responderId}`).emit('swap_request_updated', { id: requestId, status: 'ACCEPTED' });
        // Notify both users that their events changed (so frontends can refresh)
        io.to(`user:${requestRow.requester_id}`).emit('events_changed', { updatedEventIds: [responderSlotId, requesterSlotId] });
        io.to(`user:${responderId}`).emit('events_changed', { updatedEventIds: [responderSlotId, requesterSlotId] });
        console.log(`Emitted swap_request_updated(ACCEPTED) and events_changed for request ${requestId} to users ${requestRow.requester_id} and ${responderId}`);
      }
    } catch (emitErr) {
      console.error('respondToSwap(accept) emit error:', emitErr);
    }

    res.json({ message: 'Accepted' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('respondToSwap error:', err);
    res.status(500).json({ error: 'Failed to respond to swap' });
  } finally {
    client.release();
  }
};

export const cancelSwapRequest = async (req: Request, res: Response) => {
  const client = await getClient();
  try {
    const userId = (req as any).user.id;
    const { id } = req.params;

    await client.query('BEGIN');

    // Ensure request exists, is pending, and belongs to the requester
    const reqRes = await client.query('SELECT * FROM swap_requests WHERE id = $1 AND requester_id = $2 AND status = $3 FOR UPDATE', [id, userId, 'PENDING']);
    if (!reqRes.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Pending request not found or not owned by you' });
    }

    const requestRow = reqRes.rows[0];
    const requesterSlotId = requestRow.requester_slot_id;
    const responderSlotId = requestRow.responder_slot_id;

    // Mark request cancelled and reset events to SWAPPABLE
    await client.query('UPDATE swap_requests SET status = $1 WHERE id = $2', ['CANCELLED', id]);
    await client.query('UPDATE events SET status = $1 WHERE id = $2 OR id = $3', ['SWAPPABLE', requesterSlotId, responderSlotId]);

    await client.query('COMMIT');
    // Emit update to both users (responder and requester) about cancellation
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(`user:${requestRow.requester_id}`).emit('swap_request_updated', { id, status: 'CANCELLED' });
        io.to(`user:${requestRow.responder_id}`).emit('swap_request_updated', { id, status: 'CANCELLED' });
        io.to(`user:${requestRow.requester_id}`).emit('events_changed', { updatedEventIds: [requesterSlotId, responderSlotId] });
        io.to(`user:${requestRow.responder_id}`).emit('events_changed', { updatedEventIds: [requesterSlotId, responderSlotId] });
        console.log(`Emitted swap_request_updated(CANCELLED) and events_changed for request ${id} to users ${requestRow.requester_id} and ${requestRow.responder_id}`);
      }
    } catch (emitErr) {
      console.error('cancelSwapRequest emit error:', emitErr);
    }

    res.json({ message: 'Cancelled' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('cancelSwapRequest error:', err);
    res.status(500).json({ error: 'Failed to cancel swap request' });
  } finally {
    client.release();
  }
};