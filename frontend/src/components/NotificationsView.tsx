import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContextDefinition';

interface SwapRequest {
  id: number;
  responder_id: number;
  requester_id: number;
  responder_slot_id: number;
  requester_slot_id: number;
  their_slot_id: number;
  status: string;
}

const NotificationsView: React.FC = () => {
  const { user } = useContext(AuthContext)!;
  const [incoming, setIncoming] = useState<SwapRequest[]>([]);
  const [outgoing, setOutgoing] = useState<SwapRequest[]>([]);

  useEffect(() => {
    const fetchRequests = async () => {
      // Note: Add endpoints to get incoming/outgoing if needed; for simplicity, query all and filter
      const res = await axios.get('/api/swap-requests'); // Assume added endpoint GET /api/swap-requests returns all for user
      // Filter logic here; placeholder
      if (user) {
        setIncoming(res.data.filter((r: SwapRequest) => r.responder_id === user.id && r.status === 'PENDING'));
        setOutgoing(res.data.filter((r: SwapRequest) => r.requester_id === user.id && r.status === 'PENDING'));
      }
    };
    fetchRequests();
  }, [user]);

  const respond = async (id: number, accept: boolean) => {
    await axios.post(`/api/swap-response/${id}`, { accept });
    // Refetch requests after responding
    const res = await axios.get('/api/swap-requests');
    if (user) {
      setIncoming(res.data.filter((r: SwapRequest) => r.responder_id === user.id && r.status === 'PENDING'));
      setOutgoing(res.data.filter((r: SwapRequest) => r.requester_id === user.id && r.status === 'PENDING'));
    }
  };

  return (
    <div>
      <h2>Incoming Requests</h2>
      <ul>
        {incoming.map((req: SwapRequest) => (
          <li key={req.id}>
            Swap request for your slot {req.responder_slot_id} with their {req.requester_slot_id}
            <button onClick={() => respond(req.id, true)}>Accept</button>
            <button onClick={() => respond(req.id, false)}>Reject</button>
          </li>
        ))}
      </ul>
      <h2>Outgoing Requests</h2>
      <ul>
        {outgoing.map((req: SwapRequest) => (
          <li key={req.id}>Pending for slot {req.their_slot_id}</li>
        ))}
      </ul>
    </div>
  );
};

export default NotificationsView;