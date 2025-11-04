import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface CalendarEvent {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
  status: string;
}

const CalendarView: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [newEvent, setNewEvent] = useState({ title: '', startTime: '', endTime: '' });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const res = await axios.get('/api/events');
    setEvents(res.data);
  };

  const createEvent = async () => {
    await axios.post('/api/events', newEvent);
    fetchEvents();
  };

  const makeSwappable = async (id: number) => {
    await axios.put(`/api/events/${id}`, { status: 'SWAPPABLE' });
    fetchEvents();
  };

  return (
    <div>
      <h2>Your Events</h2>
      <ul>
        {events.map((event: CalendarEvent) => (
          <li key={event.id}>
            {event.title} ({event.start_time} - {event.end_time}) - {event.status}
            {event.status === 'BUSY' && <button onClick={() => makeSwappable(event.id)}>Make Swappable</button>}
          </li>
        ))}
      </ul>
      <h3>Create New Event</h3>
      <input placeholder="Title" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
      <input type="datetime-local" value={newEvent.startTime} onChange={e => setNewEvent({ ...newEvent, startTime: e.target.value })} />
      <input type="datetime-local" value={newEvent.endTime} onChange={e => setNewEvent({ ...newEvent, endTime: e.target.value })} />
      <button onClick={createEvent}>Create</button>
    </div>
  );
};

export default CalendarView;