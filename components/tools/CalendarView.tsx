import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
// Fix: Correct import path for types.
import { Project, CalendarToolData, CalendarEvent } from '../../types.ts';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

interface CalendarViewProps {
  project: Project;
  onUpdateProject: (updatedProject: Project) => void;
}

const getInitialData = (project: Project): CalendarToolData => {
    return project.tools.calendar || { events: [] };
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<CalendarToolData>(getInitialData(project));
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);

    const updateAndPersist = (newData: CalendarToolData) => {
        setData(newData);
        onUpdateProject({ ...project, tools: { ...project.tools, calendar: newData }});
    };

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));

    const calendarDays = [];
    let day = new Date(startDate);
    while (day <= endDate) {
        calendarDays.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    
    const handleAddEvent = () => {
        if (!newEventTitle.trim() || !selectedDate) return;
        const newEvent: CalendarEvent = {
            id: uuidv4(),
            title: newEventTitle,
            start: selectedDate.toISOString(),
            end: selectedDate.toISOString(),
            allDay: true
        };
        updateAndPersist({ events: [...data.events, newEvent] });
        setIsModalOpen(false);
        setNewEventTitle('');
        setSelectedDate(null);
    };
    
    const openAddEventModal = (date: Date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4 px-2">
                <Button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} size="sm" variant="secondary">&lt;</Button>
                <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <Button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} size="sm" variant="secondary">&gt;</Button>
            </div>
            <div className="grid grid-cols-7 gap-px bg-border-color border border-border-color rounded-lg flex-grow">
                {daysOfWeek.map(d => <div key={d} className="text-center font-semibold text-xs py-2 bg-surface text-text-secondary">{d}</div>)}
                {calendarDays.map((d, i) => {
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                    const isToday = new Date().toDateString() === d.toDateString();
                    const dayEvents = data.events.filter(e => new Date(e.start).toDateString() === d.toDateString());

                    return (
                        <div key={i} className={`p-2 bg-surface min-h-[120px] ${!isCurrentMonth ? 'opacity-50' : ''}`} onClick={() => openAddEventModal(d)}>
                            <span className={`text-sm ${isToday ? 'bg-brand-primary text-background font-bold rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{d.getDate()}</span>
                            <div className="mt-1 space-y-1">
                                {dayEvents.map(e => <div key={e.id} className="text-xs bg-brand-secondary/50 text-text-primary p-1 rounded truncate">{e.title}</div>)}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={`Add Event for ${selectedDate?.toLocaleDateString()}`}>
                <input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="Event title" className="w-full bg-overlay p-2 rounded-md" />
                <div className="mt-4 flex justify-end">
                    <Button onClick={handleAddEvent}>Add Event</Button>
                </div>
            </Modal>
        </div>
    );
};