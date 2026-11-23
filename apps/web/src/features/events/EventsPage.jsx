import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { api } from '../../services/api.js';
import { Calendar, Clock, Image, ArrowRight, Sparkles } from 'lucide-react';
import { GoldDivider } from '../../components/common/OrnamentalBorder.jsx';

export function EventsPage() {
  const { activeWedding } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadEvents() {
      if (!activeWedding?._id) return;
      try {
        setLoading(true);
        const res = await api.get(`/weddings/${activeWedding._id}/events`);
        if (res.success) {
          setEvents(res.data || []);
        }
      } catch (err) {
        console.error('Failed to load events:', err);
      } finally {
        setLoading(false);
      }
    }
    loadEvents();
  }, [activeWedding?._id]);

  const defaultCovers = {
    Haldi: 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80',
    Mehendi: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80',
    Sangeet: 'https://images.unsplash.com/photo-1545232979-fbf68fe9b1af?auto=format&fit=crop&w=800&q=80',
    Wedding: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=800&q=80',
    Reception: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
  };

  return (
    <div className="pb-24 px-4 max-w-md mx-auto pt-4 safe-pb">
      <div className="text-center mb-5">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-champagne/40 border border-gold/40 text-burgundy text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-gold" />
          <span>Celebration Schedule</span>
        </div>
        <h2 className="font-royal text-2xl font-bold text-burgundy mt-2">
          Wedding Events & Albums
        </h2>
        <p className="text-xs text-deepBrown/70 mt-1">
          Explore individual ceremony galleries or contribute your moments
        </p>
      </div>

      <GoldDivider className="mb-5" />

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-44 animate-pulse border border-gold/20" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-center border border-gold/30">
          <p className="text-xs text-gray-500">No events found for this wedding yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((evt) => {
            const cover = evt.coverImage || defaultCovers[evt.name] || defaultCovers.Wedding;
            const eventDate = new Date(evt.date);

            return (
              <div
                key={evt._id}
                onClick={() => navigate(`/events/${evt._id}`)}
                className="group relative bg-white rounded-2xl overflow-hidden border border-gold/40 shadow-royal hover:border-gold cursor-pointer transition active:scale-[0.99]"
              >
                {/* Event Image */}
                <div className="relative h-40 w-full overflow-hidden">
                  <img
                    src={cover}
                    alt={evt.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-deepBrown/90 via-deepBrown/30 to-transparent" />

                  {/* Photo Count Badge */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-ivory text-xs font-semibold border border-gold/40">
                    <Image className="w-3.5 h-3.5 text-gold" />
                    <span>{evt.photoCount || 0}</span>
                  </div>

                  {/* Event Title on Image */}
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <h3 className="font-royal text-xl font-bold text-ivory">
                      {evt.name}
                    </h3>
                    <div className="flex items-center gap-3 text-[11px] text-champagne/90 mt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-gold" />
                        {eventDate.toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gold" />
                        {eventDate.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Event Description & Action */}
                <div className="p-3.5 flex items-center justify-between text-deepBrown">
                  <p className="text-xs text-deepBrown/80 line-clamp-2 flex-1 mr-3 leading-relaxed">
                    {evt.description || 'Celebrate with loved ones and share your photos.'}
                  </p>
                  <div className="flex items-center gap-1 text-xs font-semibold text-burgundy group-hover:text-gold transition">
                    <span>View</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
