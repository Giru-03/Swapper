import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

const Dashboard = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loadingIds, setLoadingIds] = useState<number[]>([]);
  const [form, setForm] = useState({ title: '', startTime: '', endTime: '' });

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 5000); // Auto-refresh
    return () => clearInterval(interval);
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get('/api/events');
      setEvents(res.data);
    } catch {
      // Error fetching events
    }
  };

  const createEvent = async () => {
    await axios.post('/api/events', { ...form, status: 'BUSY' });
    setForm({ title: '', startTime: '', endTime: '' });
    setShowForm(false);
    fetchEvents();
  };

  const makeSwappable = async (id: number) => {
    if (loadingIds.includes(id)) return;
    setLoadingIds((s) => [...s, id]);
    try {
      const res = await axios.put(`/api/events/${id}`, { status: 'SWAPPABLE' });
      // Refresh events
      await fetchEvents();
      console.log('makeSwappable response', res.data);
    } catch (err) {
  console.error('makeSwappable error', err);
  alert('Failed to make swappable (see console for details)');
    } finally {
      setLoadingIds((s) => s.filter((x) => x !== id));
    }
  };

  const makeBusy = async (id: number) => {
    if (loadingIds.includes(id)) return;
    setLoadingIds((s) => [...s, id]);
    try {
      const res = await axios.put(`/api/events/${id}`, { status: 'BUSY' });
      await fetchEvents();
      console.log('makeBusy response', res.data);
    } catch (err) {
  console.error('makeBusy error', err);
  alert('Failed to make busy (see console for details)');
    } finally {
      setLoadingIds((s) => s.filter((x) => x !== id));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Your Calendar</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition cursor-pointer"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-4 rounded-lg shadow-md space-y-3">
          <input
            placeholder="Event Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full p-3 border rounded-lg"
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              className="p-3 border rounded-lg"
            />
            <input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
              className="p-3 border rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={createEvent} className="flex-1 bg-indigo-600 text-white py-2 rounded-lg">
              Create
            </button>
            <button onClick={() => setShowForm(false)} className="flex-1 bg-gray-200 py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No events yet. Create one!</p>
        ) : (
          events.map((event: Event) => (
            <div
              key={event.id}
              className={`p-4 rounded-lg border ${
                  (event.status ?? '').toString().toUpperCase() === 'SWAPPABLE' ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'
                } shadow-sm`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {format(new Date(event.start_time), 'MMM d, h:mm a')} –{' '}
                    {format(new Date(event.end_time), 'h:mm a')}
                  </p>
                </div>
                {(event.status ?? '').toString().toUpperCase() === 'BUSY' && (
                  <button
                    onClick={() => makeSwappable(event.id)}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full cursor-pointer"
                  >
                    Make Swappable
                  </button>
                )}
                {(event.status ?? '').toString().toUpperCase() === 'SWAPPABLE' && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full">
                      Swappable
                    </span>
                    <button
                      onClick={() => makeBusy(event.id)}
                      className="text-xs bg-gray-200 text-gray-800 px-3 py-1 rounded-full cursor-pointer"
                    >
                      Make Busy
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Dashboard;