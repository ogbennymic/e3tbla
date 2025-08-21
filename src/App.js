import React, { useState, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  format,
} from 'date-fns';

// Helper function to merge continuous slots, including overlapping ones
const mergeContinuousSlots = (slots) => {
  if (slots.length === 0) {
    return [];
  }

  // Sort slots by start time
  const sortedSlots = [...slots].sort((a, b) => a.start.getTime() - b.start.getTime());
  
  const merged = [sortedSlots[0]];

  for (let i = 1; i < sortedSlots.length; i++) {
    const nextSlot = sortedSlots[i];
    const lastMergedSlot = merged[merged.length - 1];

    // Check if the next slot overlaps with or is continuous with the last merged slot.
    // We check if the start time of the next slot is less than or equal to the end time of the last merged slot.
    const isOverlappingOrContinuous = nextSlot.start.getTime() <= lastMergedSlot.end.getTime();
    const isDaySame = isSameDay(nextSlot.start, lastMergedSlot.start);

    if (isOverlappingOrContinuous && isDaySame) {
      // Extend the end of the last merged slot if the next slot extends further.
      lastMergedSlot.end = new Date(Math.max(lastMergedSlot.end.getTime(), nextSlot.end.getTime()));
    } else {
      // Otherwise, add the next slot as a new merged block.
      merged.push(nextSlot);
    }
  }
  return merged;
};

// Main App component
const App = () => {
  const [loading, setLoading] = useState(true);
  const [mergedSlots, setMergedSlots] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date()); // Initial date is now the current date
  // Initialize dark mode based on the user's system preference
  const [darkMode, setDarkMode] = useState(window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // New state to trigger data refresh

  // Listen for changes in the system's color scheme
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Fetch data and merge slots on component mount or on refresh
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Dynamically calculate start and end dates for the API query
        const startDate = startOfMonth(currentDate);
        const endDate = endOfMonth(addMonths(currentDate, 1)); // Fetch current and next month's data

        const payload = {
          "operationName": "GetSlots",
          "variables": {
            "companyId": "b66f3add-b0ca-4616-9429-4131d91bd663",
            "durationMins": 60,
            "endDateISO": endDate.toISOString(),
            "serviceId": "sd47875278f6a9cae55db387b8ef496dffb51e049",
            "staffId": "r15a01661825915529",
            "startDateISO": startDate.toISOString(),
            "timeZone": "America/New_York"
          },
          "query": `query GetSlots($companyId: ID!, $durationMins: Int!, $endDateISO: String!, $serviceId: ID, $staffId: ID, $startDateISO: String!, $timeZone: String!) {
            slots(
              where: {companyId: $companyId, durationMins: $durationMins, endDateISO: $endDateISO, serviceId: $serviceId, staffId: $staffId, startDateISO: $startDateISO, timeZone: $timeZone}
            ) {
              ...Slot_props
              __typename
            }
          }
          
          fragment Slot_props on Slot {
            displayDateTime
            ms
            staffId
            duration
            isVideoEnabled
            __typename
          }`
        };

        const response = await fetch("https://cbphandlers.setmore.com/handlers/graphql?operation=GetSlots", {
          "headers": {
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "content-type": "application/json",
            "Referer": "https://e3tampabay.setmore.com/"
          },
          "body": JSON.stringify(payload),
          "method": "POST"
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const rawData = await response.json();
        
        // Check for common GraphQL errors or unexpected data structure
        if (rawData.errors) {
            console.error("GraphQL API Error:", rawData.errors);
            setMergedSlots([]);
        } else if (rawData && rawData.data && rawData.data.slots) {
            const parsedData = rawData.data.slots.map(slot => {
            const start = new Date(parseInt(slot.ms));
            const end = new Date(start.getTime() + 60 * 60000); // Duration is 60 minutes based on fetch body
            return {
                ...slot,
                start,
                end,
            };
            });

            const merged = mergeContinuousSlots(parsedData);
            setMergedSlots(merged);
        } else {
            console.error("Failed to fetch data: The response body did not contain the expected data structure.");
            setMergedSlots([]);
        }
        
      } catch (error) {
        console.error("Failed to fetch or merge data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [currentDate, refreshTrigger]); // Added refreshTrigger to the dependency array

  const handlePrevMonth = () => {
    setCurrentDate(addMonths(currentDate, -1));
  };

  const handleNextMonth = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };
  
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate the days for the calendar grid
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const allDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`min-h-screen p-8 font-sans ${darkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Main Title and Dark Mode Toggle */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold flex items-center">
            <img 
              src="https://avatar.setmore.com/files/img/fumpBU2c5zaa/e3-logo-2color-cmyk.jpg?crop=2248%3B2248%3B80%3B80&w=80&h=80" 
              alt="E3 Tampa Bay logo" 
              className="w-10 h-10 mr-2 rounded-full" 
            />
            <img 
              src="https://avatar.anywhere.app/files/img/fZJaneUOBCYa/profilepic.png" 
              alt="Anywhere App logo" 
              className="w-10 h-10 mr-4 rounded-full" 
            />
            E3 Tampa Bay Main Lift Availability
          </h1>
          <button
            onClick={toggleDarkMode}
            className={`p-2 rounded-full transition-colors duration-200 focus:outline-none 
              ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m4.93 19.07 1.41-1.41"></path>
                <path d="m17.66 6.34 1.41-1.41"></path>
              </svg>
            )}
          </button>
        </div>

        {/* Calendar Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <button
              onClick={handlePrevMonth}
              className={`p-2 rounded-full transition-colors duration-200 focus:outline-none 
                ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-full transition-colors duration-200 focus:outline-none 
                ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 6"></path>
                <path d="M21 3v3h-3"></path>
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 18"></path>
                <path d="M3 21v-3h3"></path>
              </svg>
            </button>
            <button
              onClick={handleNextMonth}
              className={`p-2 rounded-full transition-colors duration-200 focus:outline-none 
                ${darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-200 text-gray-600'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
          </div>
          <h2 className="text-2xl font-bold">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Day of week headers */}
          {daysOfWeek.map(day => (
            <div key={day} className={`text-center font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {day}
            </div>
          ))}

          {/* Day cells */}
          {allDays.map((day, index) => {
            const daySlots = mergedSlots.filter(slot => isSameDay(slot.start, day));
            const isCurrentMonth = isSameMonth(day, currentDate);
            const today = new Date();
            const isToday = isSameDay(day, today);

            return (
              <div
                key={index}
                className={`p-2 h-32 rounded-lg border transition-shadow duration-200
                  ${isCurrentMonth ? (darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200') : (darkMode ? 'bg-gray-900 border-gray-800 text-gray-400' : 'bg-gray-50 border-gray-200 text-gray-400')}
                  ${isToday ? 'border-blue-500 ring-2 ring-blue-500' : ''}
                `}
              >
                <div className={`font-semibold text-lg mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>{format(day, 'd')}</div>
                <div className="space-y-1 overflow-y-auto max-h-20 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
                  {loading ? (
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-gray-200 rounded-md dark:bg-gray-700"></div>
                      <div className="h-4 bg-gray-200 rounded-md dark:bg-gray-700"></div>
                    </div>
                  ) : daySlots.length > 0 ? (
                    daySlots.map((slot, i) => (
                      <div
                        key={i}
                        className="bg-blue-500 text-white p-1 rounded-md text-xs truncate"
                      >
                        {format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}
                      </div>
                    ))
                  ) : (
                    <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>No slots</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default App;
