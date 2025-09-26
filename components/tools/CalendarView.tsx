import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Project, CalendarToolData, CalendarEvent } from '../../types.ts';
import { Button } from '../common/Button.tsx';
import { Modal } from '../common/Modal.tsx';

interface CalendarViewProps {
  project: Project;
  onUpdateProject: (updater: (project: Project) => Project) => void;
}

const getInitialData = (project: Project): CalendarToolData => {
    return project.tools.calendar || { events: [] };
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const deadlineKeywords = ['deadline', 'urgent', 'final', 'submit', 'due'];
const importantKeywords = ['exam', 'test', 'quiz'];

const getDayBoxStyle = (events: CalendarEvent[]) => {
    if (events.some(e => deadlineKeywords.some(k => e.title.toLowerCase().includes(k)))) {
        return 'bg-red-500/20 border-red-500/50';
    }
    if (events.some(e => importantKeywords.some(k => e.title.toLowerCase().includes(k)))) {
        return 'bg-green-500/20 border-green-500/50';
    }
    return '';
};

const getEventItemStyle = (event: CalendarEvent) => {
    const title = event.title.toLowerCase();
    if (deadlineKeywords.some(keyword => title.includes(keyword))) {
        return 'text-red-300 font-semibold';
    }
    if (importantKeywords.some(keyword => title.includes(keyword))) {
        return 'text-green-300 font-semibold';
    }
    return 'text-text-primary';
};


export const CalendarView: React.FC<CalendarViewProps> = ({ project, onUpdateProject }) => {
    const [data, setData] = useState<CalendarToolData>(getInitialData(project));
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [newEventTitle, setNewEventTitle] = useState('');

    const updateAndPersist = (newData: CalendarToolData) => {
        setData(newData);
        onUpdateProject(p => ({ ...p, tools: { ...p.tools, calendar: newData }}));
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
        setNewEventTitle('');
        setIsAddingEvent(false);
    };

    const handleDeleteEvent = (eventId: string) => {
        const newEvents = data.events.filter(e => e.id !== eventId);
        updateAndPersist({ events: newEvents });
    };
    
    const openDayModal = (date: Date) => {
        setSelectedDate(date);
        setIsModalOpen(true);
        setIsAddingEvent(false);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedDate(null);
        setIsAddingEvent(false);
    };

    const dayEventsInModal = selectedDate
        ? data.events.filter(e => new Date(e.start).toDateString() === selectedDate.toDateString())
        : [];

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
                    const dayBoxStyle = getDayBoxStyle(dayEvents);

                    return (
                        <div key={i} className={`p-2 bg-surface min-h-[100px] flex flex-col cursor-pointer hover:bg-overlay transition-colors ${!isCurrentMonth ? 'opacity-50' : ''} ${dayBoxStyle}`} onClick={() => openDayModal(d)}>
                            <span className={`text-sm self-start ${isToday ? 'bg-brand-primary text-background font-bold rounded-full w-6 h-6 flex items-center justify-center' : ''}`}>{d.getDate()}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {dayEvents.slice(0, 4).map(e => {
                                    const title = e.title.toLowerCase();
                                    let dotColor = 'bg-brand-secondary';
                                    if (deadlineKeywords.some(k => title.includes(k))) dotColor = 'bg-red-400';
                                    else if (importantKeywords.some(k => title.includes(k))) dotColor = 'bg-green-400';
                                    return <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></div>
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={`Events for ${selectedDate?.toLocaleDateString()}`}>
                <div className="space-y-3">
                    {dayEventsInModal.length > 0 ? (
                        dayEventsInModal.map(event => (
                            <div key={event.id} className="flex justify-between items-center bg-overlay p-3 rounded-md">
                                <span className={getEventItemStyle(event)}>{event.title}</span>
                                <button onClick={() => handleDeleteEvent(event.id)} className="text-red-400 hover:text-red-600 text-xl flex-shrink-0 ml-4">&times;</button>
                            </div>
                        ))
                    ) : (
                        <p className="text-text-secondary text-center py-4">No events scheduled for this day.</p>
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-border-color">
                    {isAddingEvent ? (
                        <div className="space-y-2">
                             <input type="text" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} placeholder="New event title" autoFocus className="w-full bg-background-dark p-2 rounded-md border border-border-color" />
                             <div className="flex justify-end gap-2">
                                <Button onClick={() => setIsAddingEvent(false)} variant="secondary">Cancel</Button>
                                <Button onClick={handleAddEvent}>Save Event</Button>
                             </div>
                        </div>
                    ) : (
                        <Button onClick={() => setIsAddingEvent(true)} className="w-full" variant="secondary">Add New Event</Button>
                    )}
                </div>
            </Modal>
        </div>
    );
};