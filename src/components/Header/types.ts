export interface MenuGroup {
  heading: string;
  items: MenuItem[];
}

export interface MenuItem {
  title: string;
  path?: string;
  submenu?: MenuItem[];
  groupedSubmenu?: MenuGroup[];
}
