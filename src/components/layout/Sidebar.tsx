import {
  CalendarCheck2,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings,
  Users,
  X,
} from 'lucide-react';
import type {NavSection} from '../../types/dental';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  clinicName: string;
  attentionCount: number;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenAuthPortal: () => void;
  onSignOut?: () => void;
  isAuthenticated: boolean;
  activeStaffName: string;
  activeStaffEmail: string;
}

interface NavGroup {
  label: string;
  items: Array<{
    id: NavSection;
    label: string;
    icon: typeof LayoutDashboard;
  }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Clinic',
    items: [
      {id: 'overview', label: 'Overview', icon: LayoutDashboard},
      {id: 'patients', label: 'Patients', icon: Users},
    ],
  },
  {
    label: 'Follow-Up Care',
    items: [
      {id: 'follow-ups', label: 'Follow-Ups', icon: ClipboardList},
      {id: 'treatments', label: 'Treatment Tracker', icon: FileSpreadsheet},
      {id: 'recalls', label: 'Patient Recall', icon: CalendarCheck2},
    ],
  },
  {
    label: 'Practice Tools',
    items: [
      {id: 'messages', label: 'Message Centre', icon: MessageSquareText},
      {id: 'settings', label: 'Settings', icon: Settings},
    ],
  },
];

function DentalLoopLogoMark() {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      aria-hidden="true"
      className="h-9 w-9 shrink-0"
    >
      <rect width="36" height="36" rx="10" fill="#203344" />
      <rect
        x="1"
        y="1"
        width="34"
        height="34"
        rx="9"
        stroke="#DCE9E2"
        strokeOpacity="0.3"
        strokeWidth="1"
      />
      <path
        d="M12.5 13C12.5 10.6 14.4 9 16.8 9H19.2C21.6 9 23.5 10.6 23.5 13V16.6C23.5 21 21.2 24.8 19.1 26.8C18.5 27.4 17.5 27.4 16.9 26.8C14.8 24.8 12.5 21 12.5 16.6V13Z"
        stroke="#FFFFFF"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.2 16.4L17.2 18.4L21.1 14.5"
        stroke="#DCE9E2"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Sidebar({
  activeSection,
  onSelectSection,
  clinicName,
  attentionCount,
  mobileOpen,
  onCloseMobile,
  onOpenAuthPortal,
  onSignOut,
  isAuthenticated,
  activeStaffName,
  activeStaffEmail,
}: SidebarProps) {
  const initials = activeStaffName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || 'DL';

  const navContent = (
    <div className="flex h-full flex-col border-r border-[#12393C] bg-[#174C4F] text-white">
      {/* Brand Identity */}
      <div className="flex items-start justify-between gap-3 border-b border-white/12 px-5 py-5">
        <div className="flex items-center gap-3 min-w-0">
          <DentalLoopLogoMark />
          <div className="min-w-0">
            <div className="font-display text-[17px] font-bold tracking-tight text-white">
              Dental Loop
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-[#DCE9E2]/80">
              Nothing important falls through the cracks.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
          className="rounded-lg p-1.5 text-[#DCE9E2] hover:bg-white/10 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Active Practice Context */}
      <div className="px-4 pt-4 pb-1">
        <div className="rounded-xl border border-white/12 bg-[#113A3D] px-3.5 py-2.5">
          <div className="text-[11px] font-medium text-[#DCE9E2]/75">
            {isAuthenticated ? 'Active Clinic Practice' : 'Active Demonstration Clinic'}
          </div>
          <div className="mt-0.5 truncate text-xs font-semibold text-white">
            {clinicName}
          </div>
        </div>
      </div>

      {/* Grouped Navigation */}
      <nav
        className="flex-1 overflow-y-auto px-3 py-4"
        aria-label="Primary Navigation"
      >
        <div className="space-y-5">
          {NAV_GROUPS.map((group, groupIdx) => (
            <div
              key={group.label}
              className={groupIdx > 0 ? 'border-t border-white/10 pt-4' : ''}
            >
              <div className="mb-1.5 px-3 text-[11px] font-semibold tracking-wide text-[#DCE9E2]/65">
                {group.label}
              </div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onSelectSection(item.id);
                        onCloseMobile();
                      }}
                      className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-[13.5px] transition-colors whitespace-nowrap ${
                        isActive
                          ? 'bg-[#203344] font-semibold text-white ring-1 ring-inset ring-[#DCE9E2]/25 shadow-xs'
                          : 'font-medium text-[#DCE9E2]/90 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-[#DCE9E2]'
                              : 'text-[#DCE9E2]/70 group-hover:text-white'
                          }`}
                        />
                        <span>{item.label}</span>
                      </span>
                      {item.id === 'follow-ups' && attentionCount > 0 && (
                        <span
                          className={`tabular-nums rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                            isActive
                              ? 'bg-[#D99A38] text-[#203344]'
                              : 'bg-white/15 text-[#DCE9E2]'
                          }`}
                        >
                          {attentionCount}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Account Footer */}
      <div className="border-t border-white/12 bg-[#123D40] p-4">
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#203344] text-xs font-semibold text-[#DCE9E2] ring-1 ring-white/15">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">
              {activeStaffName}
            </div>
            <div className="truncate text-[11px] text-[#DCE9E2]/75">
              {activeStaffEmail}
            </div>
          </div>
        </div>
        {isAuthenticated && onSignOut ? (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onSignOut();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0 text-[#DCE9E2]" />
            <span>Sign Out</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              onCloseMobile();
              onOpenAuthPortal();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-white/15"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0 text-[#DCE9E2]" />
            <span>Sign In with Google</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:block lg:w-64">
        {navContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="fixed inset-0 bg-[#203344]/60 backdrop-blur-[2px]"
            aria-hidden="true"
            onClick={onCloseMobile}
          />
          <aside className="relative z-10 w-72 max-w-[82vw] flex-1">
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
