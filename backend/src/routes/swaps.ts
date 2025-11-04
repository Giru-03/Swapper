import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { getSwappableSlots, createSwapRequest, respondToSwap, cancelSwapRequest } from '../controllers/swaps';
import { query } from '../models';

const router = Router();

router.use(authenticate);

router.get('/swappable-slots', getSwappableSlots);
router.post('/swap-request', createSwapRequest);
router.post('/swap-response/:requestId', respondToSwap);
router.delete('/swap-request/:id', cancelSwapRequest);
router.get('/swap-requests', authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user.id;
  const result = await query(`
    SELECT 
      sr.*,
      e1.title AS requester_title,
      e2.title AS responder_title,
      u1.name AS requester_name
    FROM swap_requests sr
    JOIN events e1 ON sr.requester_slot_id = e1.id
    JOIN events e2 ON sr.responder_slot_id = e2.id
    JOIN users u1 ON sr.requester_id = u1.id
    WHERE sr.requester_id = $1 OR sr.responder_id = $1
  `, [userId]);
  res.json(result.rows);
});

export default router;