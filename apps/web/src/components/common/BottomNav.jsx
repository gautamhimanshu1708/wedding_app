import React from 'react';
import { NavLink } from 'react-router-dom';
import { Flame, Calendar, PlusCircle, Image as ImageIcon, User } from 'lucide-react';

export function BottomNav() {
  const navItems = [
    { to: '/live', label: 'Live', icon: Flame },
    { to: '/events', label: 'Events', icon: Calendar },
    { to: '/upload', label: 'Upload', icon: PlusCircle, isPrimary: true },
    { to: '/my-uploads', label: 'My Uploads', icon: ImageIcon },
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-burgundy/95 backdrop-blur-lg border-t border-gold/40 text-champagne safe-pb shadow-royal">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          if (item.isPrimary) {
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center -mt-5 group focus:outline-none`
                }
              >
                {({ isActive }) => (
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-13 h-13 p-3 rounded-full shadow-royal-lg flex items-center justify-center transition-transform active:scale-95 ${
                        isActive
                          ? 'bg-gradient-to-tr from-goldDark via-gold to-goldLight text-burgundy ring-2 ring-gold/80 scale-105'
                          : 'bg-gold text-burgundy hover:brightness-110'
                      }`}
                    >
                      <Icon className="w-6 h-6 stroke-[2.2]" />
                    </div>
                    <span
                      className={`text-[10px] mt-1 font-medium transition ${
                        isActive ? 'text-goldLight font-bold' : 'text-champagne font-medium'
                      }`}
                    >
                      {item.label}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 h-full py-1 min-w-[50px] min-h-[44px] transition-colors ${
                  isActive ? 'text-goldLight font-bold' : 'text-champagne font-medium hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 stroke-[2.2]' : 'stroke-[1.8]'}`} />
                    {isActive && (
                      <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gold" />
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
