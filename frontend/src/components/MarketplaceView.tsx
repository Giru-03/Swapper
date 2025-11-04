import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Slot {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  owner_name: string;
  status: string;
  user_id?: number;
}

const MarketplaceView: React.FC = () => {
  const [swappableSlots, setSwappableSlots] = useState<Slot[]>([]);
  const [mySwappableSlots, setMySwappableSlots] = useState<Slot[]>([]);
  const [selectedTheirId, setSelectedTheirId] = useState<number | null>(null);
  const [selectedMyId, setSelectedMyId] = useState<number | null>(null);

  useEffect(() => {
    fetchSwappableSlots();
    fetchMySwappable();
  }, []);

  const fetchSwappableSlots = async () => {
    const res = await axios.get('/api/swappable-slots');
    setSwappableSlots(res.data);
  };

  const fetchMySwappable = async () => {
    const res = await axios.get('/api/events');
    setMySwappableSlots(res.data.filter((e: Slot) => e.status === 'SWAPPABLE'));
  };

  const requestSwap = async () => {
    if (selectedMyId && selectedTheirId) {
      await axios.post('/api/swap-request', { mySlotId: selectedMyId, theirSlotId: selectedTheirId });
      fetchSwappableSlots(); // Update state
      setSelectedTheirId(null);
    }
  };

  return (
    <div>
      <h2>Available Swappable Slots</h2>
      <ul>
        {swappableSlots.map((slot: Slot) => (
          <li key={slot.id}>
            {slot.title} ({slot.start_time} - {slot.end_time}) by {slot.owner_name}
            <button onClick={() => setSelectedTheirId(slot.id)}>Request Swap</button>
          </li>
        ))}
      </ul>
      {selectedTheirId && (
        <div>
          <h3>Choose Your Slot to Offer</h3>
          <select onChange={e => setSelectedMyId(Number(e.target.value))}>
            <option value="">Select</option>
            {mySwappableSlots.map((slot: Slot) => (
              <option key={slot.id} value={slot.id}>{slot.title}</option>
            ))}
          </select>
          <button onClick={requestSwap}>Submit Request</button>
        </div>
      )}
    </div>
  );
};

export default MarketplaceView;