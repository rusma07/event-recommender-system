import React from "react";

const CalendarIcon = () => <span className="mr-1">📅</span>;
const LocationIcon = () => <span className="mr-1">📍</span>;
const TagsIcon = () => <span className="mr-1">🏷️</span>;
const PriceIcon = () => <span className="mr-1">💲</span>;


const formatDate = (dateString) => {
  if (!dateString || dateString === "TBD" || dateString === "Postponed") return "TBD";
  const date = new Date(dateString);
  if (isNaN(date)) return dateString;
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const EventCard = ({ event, onView }) => {
  const formattedStart = formatDate(event.start_date);
  const formattedEnd = event.end_date ? formatDate(event.end_date) : "TBD";

  return (
    <div
      className="group flex flex-col md:flex-row border border-gray-200 rounded-2xl bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden cursor-pointer hover:-translate-y-1 min-h-[340px]"
      onClick={() => onView(event)}
    >
      {/* Image */}
      <div className="relative w-full md:w-80 h-64 md:h-auto flex-shrink-0 overflow-hidden">
        <img
          src={event.image}
          alt={event.title}
          className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-300"
        />
        <span className="absolute top-3 right-3 bg-indigo-600 text-white text-sm font-semibold px-3 py-1 rounded-full shadow-md">
          {event.price && event.price !== "0" ? `NPR ${event.price}` : "Free"}
        </span>
      </div>

      {/* Details */}
      <div className="flex-1 p-6 flex flex-col justify-between">
        <div>
          <h3 className="text-2xl font-bold text-gray-900 mb-3 group-hover:text-indigo-600 transition-colors">
            {event.title}
          </h3>

          <div className="space-y-3 text-gray-700 text-lg leading-relaxed">
            <p className="flex items-center gap-2">
              <CalendarIcon />
              <span className="font-medium">
                {formattedStart} – {formattedEnd}
              </span>
            </p>

            <p className="flex items-center gap-2">
              <LocationIcon />
              <span>{event.location}</span>
            </p>

            <p className="flex items-start gap-2 text-gray-600 flex-wrap">
              <TagsIcon />
              <span className="flex flex-wrap gap-2">
                {Array.isArray(event.tags)
                  ? event.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-gray-100 px-3 py-1 rounded-full text-base text-gray-700"
                      >
                        {tag}
                      </span>
                    ))
                  : event.tags}
              </span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6">
          <p className="flex items-center text-indigo-600 font-semibold text-lg">
            <PriceIcon />
            {event.price && event.price !== "0"
              ? `NPR ${event.price}`
              : "Free"}
          </p>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(event);
            }}
            className="px-6 py-3 text-base font-semibold rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
          >
            View Event
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventCard;
