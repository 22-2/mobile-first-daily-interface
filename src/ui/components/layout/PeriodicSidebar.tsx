import { useState } from "react";
import { MiniCalendar } from "src/ui/components/calendar/MiniCalendar";
import { SidebarScales } from "src/ui/components/layout/SidebarScales";
import { TagList } from "src/ui/components/layout/TagList";

export const PeriodicSidebar: React.FC = () => {
  const [sideBarViewDate, setSideBarViewDate] = useState(() => window.moment());

  return (
    <>
      <MiniCalendar onViewDateChange={setSideBarViewDate} />
      <SidebarScales
        viewedDate={sideBarViewDate}
        onViewDateChange={setSideBarViewDate}
      />
      <TagList />
    </>
  );
};
