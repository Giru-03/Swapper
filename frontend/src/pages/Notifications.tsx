import { useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Check, X, Clock } from 'lucide-react';

interface SwapRequest {
  id: number;
  responder_id: number;
  requester_id: number;
  requester_name: string;
  requester_title: string;
  responder_title: string;
  status: string;
}

const Notifications = () => {
  const { user, socket } = useContext(AuthContext)!;
  const [incoming, setIncoming] = useState<SwapRequest[]>([]);
  const [outgoing, setOutgoing] = useState<SwapRequest[]>([]);

  const fetchRequests = useCallback(async () => {
    try {
      // Wait until we know who the current user is before fetching.
      if (!user) {
        setIncoming([]);
        setOutgoing([]);
        return;
      }

      const res = await axios.get('/api/swap-requests');
      // Only show incoming where the current user is the responder and status is PENDING
      setIncoming(res.data.filter((r: SwapRequest) => r.responder_id === user.id && r.status === 'PENDING'));
      // Only show outgoing where the current user is the requester
      setOutgoing(res.data.filter((r: SwapRequest) => r.requester_id === user.id));
    } catch (err) {
      console.error('Failed to fetch swap requests', err);
      setIncoming([]);
      setOutgoing([]);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, [fetchRequests]);

  // Real-time socket listeners: if a socket exists on the auth context, listen for server events
  useEffect(() => {
    if (!socket) return;

    const onCreated = (payload: unknown) => {
      console.log('Socket event received: swap_request_created', payload);
      fetchRequests();
    };
    const onUpdated = (payload: unknown) => {
      console.log('Socket event received: swap_request_updated', payload);
      fetchRequests();
    };
    const onEventsChanged = (payload: unknown) => {
      console.log('Socket event received: events_changed', payload);
      // If events changed include relevant IDs, we simply refetch requests and let other pages poll for events
      fetchRequests();
    };

    socket.on('swap_request_created', onCreated);
    socket.on('swap_request_updated', onUpdated);
    socket.on('events_changed', onEventsChanged);

    return () => {
      socket.off('swap_request_created', onCreated);
      socket.off('swap_request_updated', onUpdated);
      socket.off('events_changed', onEventsChanged);
    };
  }, [socket, fetchRequests]);

  // no local banner: socket events will trigger a refetch but UI-level toasts are handled globally

  const respond = async (id: number, accept: boolean) => {
    await axios.post(`/api/swap-response/${id}`, { accept });
    fetchRequests();
  };

  return (
    <div className="space-y-6">
      {/* Notifications page uses global toasts — no local banner here */}
      <h2 className="text-2xl font-bold text-gray-900">Swap Requests</h2>

      <div>
        <h3 className="font-semibold text-lg mb-3">Incoming</h3>
        {incoming.length === 0 ? (
          <p className="text-gray-500">No incoming requests.</p>
        ) : (
          incoming.map((req: SwapRequest) => (
            <div key={req.id} className="bg-white p-4 rounded-lg border mb-3 shadow-sm overflow-y-auto">
              <p className="text-sm">
                <strong>{req.requester_name}</strong> wants to swap:
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Your: {req.responder_title} → Their: {req.requester_title}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => respond(req.id, true)}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Accept
                </button>
                <button
                  onClick={() => respond(req.id, false)}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg flex items-center justify-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div>
        <h3 className="font-semibold text-lg mb-3">Outgoing</h3>
        {outgoing.length === 0 ? (
          <p className="text-gray-500">No outgoing requests.</p>
        ) : (
          outgoing.map((req: SwapRequest) => (
            <div key={req.id} className="bg-gray-50 p-4 rounded-lg border mb-3">
              <p className="text-sm flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {req.status === 'PENDING' ? 'Pending...' : req.status}
              </p>
              <p className="text-xs text-gray-600">
                You offered: {req.requester_title} → For: {req.responder_title}
              </p>
              {req.status === 'PENDING' && (
                <div className="mt-3">
                  <button
                    onClick={async () => {
                      try {
                        await axios.delete(`/api/swap-request/${req.id}`);
                        fetchRequests();
                      } catch {
                        // ignore
                      }
                    }}
                    className="bg-yellow-500 text-white py-1 px-3 rounded-lg text-sm cursor-pointer"
                  >
                    Cancel Request
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Notifications;