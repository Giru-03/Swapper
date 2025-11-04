import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, User, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Slot {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  owner_name: string;
  status: string;
}

const Marketplace = () => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [mySlots, setMySlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedMySlot, setSelectedMySlot] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAll = async () => {
    const [s1, s2] = await Promise.all([
      axios.get('/api/swappable-slots'),
      axios.get('/api/events'),
    ]);
    setSlots(s1.data);
    setMySlots(s2.data.filter((e: Slot) => e.status === 'SWAPPABLE'));
  };

  const requestSwap = async () => {
    if (!selectedMySlot || !selectedSlot) return;
    await axios.post('/api/swap-request', {
      mySlotId: selectedMySlot,
      theirSlotId: selectedSlot.id,
    });
    setSelectedSlot(null);
    setSelectedMySlot(null);
    fetchAll();
  };

  const filtered = slots.filter((s: Slot) =>
    s.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Swap Marketplace</h2>

      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border rounded-lg"
        />
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No swappable slots found.</p>
        ) : (
          filtered.map((slot: Slot) => (
            <div
              key={slot.id}
              onClick={() => setSelectedSlot(slot)}
              className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition cursor-pointer"
              role="button"
              tabIndex={0}
            >
              <div className="flex justify-between">
                <div>
                  <h3 className="font-semibold">{slot.title}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(slot.start_time), 'MMM d, h:mm a')} –{' '}
                    {format(new Date(slot.end_time), 'h:mm a')}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                    <User className="w-4 h-4" />
                    {slot.owner_name}
                  </p>
                </div>
                <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full self-start">
                  Available
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {selectedSlot && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-lg font-bold">Request Swap</h3>
            <p className="text-sm text-gray-600">
              You want: <strong>{selectedSlot.title}</strong>
            </p>
            <select
              onChange={(e) => setSelectedMySlot(Number(e.target.value))}
              className="w-full p-3 border rounded-lg"
            >
              <option value="">Choose your slot to offer</option>
              {mySlots.map((s: Slot) => (
                <option key={s.id} value={s.id}>
                  {s.title} ({format(new Date(s.start_time), 'MMM d, h:mm a')})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                onClick={requestSwap}
                disabled={!selectedMySlot}
                className="flex-1 bg-indigo-600 text-white py-2 rounded-lg disabled:opacity-50 cursor-pointer"
              >
                Send Request
              </button>
              <button
                onClick={() => {
                  setSelectedSlot(null);
                  setSelectedMySlot(null);
                }}
                className="flex-1 bg-gray-200 py-2 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Marketplace;