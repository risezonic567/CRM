// src/Components/SideBarDashboard/SideBarDashboard.jsx
import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { TAB_REGISTRY } from "../TabRegistry";
import {
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  ROLES,
  CURRENT_USER,
  filterSubItemsByRole,
  syncCurrentUserFromAuth,
} from "../roles";
import AppLoading from "../shared/AppLoading";
import {
  selectCurrentUser,
  logout as logoutAction,
} from "../../REDUX_FEATURES/REDUX_SLICES/Auth_api/authSlice";
import { useLogoutMutation } from "../../REDUX_FEATURES/REDUX_SLICES/Auth_api/authApi";
import { Plane, LogOut } from "lucide-react";

const getRoleInitials = (roleName) => {
  if (!roleName) return "?";
  return roleName
    .split(/[_\s]+/)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const SIDEBAR_NAV_FOCUS =
  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white/15 focus-visible:ring-offset-0";
const SIDEBAR_NAV = {
  active: `text-white font-medium border-l-[3px] border-transparent ${SIDEBAR_NAV_FOCUS}`,
  idle: `text-white/80 hover:text-white border-l-[3px] border-transparent ${SIDEBAR_NAV_FOCUS}`,
  subActive: `bg-white/[0.12] text-white font-medium ${SIDEBAR_NAV_FOCUS}`,
  subIdle: `text-white/70 hover:bg-white/[0.05] hover:text-white ${SIDEBAR_NAV_FOCUS}`,
};

const SideBarDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const authUser = useSelector(selectCurrentUser);
  const [logoutApi] = useLogoutMutation();

  useEffect(() => {
    syncCurrentUserFromAuth(authUser);
  }, [authUser]);

  const activeRole = CURRENT_USER.role || ROLES.ADMIN;
  const allowedTabIds = ROLE_PERMISSIONS[activeRole] || [];
  const allowedTabs = TAB_REGISTRY.filter((tab) =>
    allowedTabIds.includes(tab.id)
  );
  const defaultTab = allowedTabs[0]?.id || "dashboard";

  const tabFromUrl = searchParams.get("tab");
  const activeTab =
    tabFromUrl && allowedTabIds.includes(tabFromUrl) ? tabFromUrl : defaultTab;
  const activeCtab = searchParams.get("ctab") || null;

  const [expandedTab, setExpandedTab] = useState(() => {
    const initialTab = new URLSearchParams(window.location.search).get("tab");
    const entry = allowedTabs.find(
      (t) => t.id === initialTab && t.subItems?.length
    );
    return entry ? entry.id : null;
  });

  const [indicatorStyle, setIndicatorStyle] = useState({
    top: 0,
    height: 0,
    opacity: 0,
  });

  useEffect(() => {
    const updateIndicator = () => {
      const activeBtn = document.getElementById(`sidebar-btn-${activeTab}`);
      const navContainer = document.getElementById("sidebar-nav-container");
      if (activeBtn && navContainer) {
        setIndicatorStyle({
          top: activeBtn.offsetTop,
          height: activeBtn.offsetHeight,
          opacity: 1,
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    updateIndicator();
    const timer = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timer);
  }, [activeTab, expandedTab, isExpanded]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const urlTab = searchParams.get("tab");
    const urlIsWrong = !urlTab || !allowedTabIds.includes(urlTab);

    if (urlIsWrong) {
      // Preserve non-tab params only when fixing missing/invalid tab
      const next = new URLSearchParams(searchParams);
      next.set("tab", defaultTab);
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams, defaultTab, allowedTabIds]);

  const handleTabClick = (tab) => {
    if (!allowedTabIds.includes(tab.id)) return;

    const hasSubItems = tab.subItems?.length > 0;
    const isCurrentlyExpanded = expandedTab === tab.id;

    if (hasSubItems) {
      if (isCurrentlyExpanded) {
        setExpandedTab(null);
        setSearchParams({ tab: tab.id });
      } else {
        setExpandedTab(tab.id);
        const filteredSubs = filterSubItemsByRole(tab.id, tab.subItems);
        const firstSub = filteredSubs[0] || tab.subItems[0];
        setSearchParams({ tab: tab.id, ctab: firstSub.id });
      }
    } else {
      setExpandedTab(null);
      setSearchParams({ tab: tab.id });
    }

    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleSubItemClick = (parentId, subId) => {
    if (!allowedTabIds.includes(parentId)) return;
    setExpandedTab(parentId);
    setSearchParams({ tab: parentId, ctab: subId });

    if (window.innerWidth < 768) {
      setIsMobileMenuOpen(false);
    }
  };

  const handleSwitchTab = (tabId) => {
    const tab = allowedTabs.find((t) => t.id === tabId);
    if (tab) handleTabClick(tab);
  };

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);

  const handleLogout = async () => {
    try {
      await logoutApi().unwrap();
    } catch {
      /* still clear local session */
    }
    dispatch(logoutAction());
    syncCurrentUserFromAuth(null);
    navigate("/login");
  };

  const activeTabConfig = allowedTabs.find((t) => t.id === activeTab);
  const activeSubItem = activeTabConfig?.subItems?.find(
    (s) => s.id === activeCtab
  );
  const TabComponent =
    activeCtab && activeSubItem?.component
      ? activeSubItem.component
      : activeTabConfig?.component ?? null;

  const activeSubLabel = activeSubItem?.label;
  const headerTitle = activeSubLabel
    ? `${activeTabConfig?.label || "Dashboard"} / ${activeSubLabel}`
    : activeTabConfig?.label || "Dashboard";

  return (
    <div className="relative min-h-screen bg-app-bg overflow-hidden flex h-screen font-sans">
      {/* Mobile Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hover to Expand */}
      <aside
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
        className={`
          fixed left-0 top-0 h-screen z-50
          flex flex-col shrink-0 bg-app-sidebar border-r border-slate-700/60
          overflow-hidden shadow-xl
          ${isMobileMenuOpen ? "left-0" : "-left-full md:left-0"}
        `}
        style={{
          width: isExpanded ? "240px" : "64px",
          transition: "width 250ms ease",
        }}
      >
        {/* Brand / Logo */}
        <div className="relative shrink-0 border-b border-white/10 py-3">
          <div
            className={`flex items-center justify-center w-full overflow-hidden transition-all duration-200 ${
              isExpanded ? "h-14 px-4" : "h-12"
            }`}
          >
            {isExpanded ? (
              <div className="flex items-center gap-2.5 w-full">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                  <Plane className="w-5 h-5 text-sky-300" strokeWidth={2} />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-bold text-white text-base tracking-wide whitespace-nowrap">
                    Risezonic
                  </span>
                  <span className="text-[10px] text-sky-200/70 uppercase tracking-wider font-semibold whitespace-nowrap">
                    Smart Travel Business
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400 border border-sky-400/30">
                <Plane className="w-5 h-5 text-sky-300" strokeWidth={2} />
              </div>
            )}
          </div>

          {/* Role badge */}
          {isExpanded ? (
            <div className="mt-2 text-center">
              <span className="inline-block px-2.5 py-0.5 text-[10px] rounded text-white bg-white/[0.08] border border-white/10 whitespace-nowrap font-medium">
                {ROLE_LABELS[activeRole] || activeRole}
              </span>
            </div>
          ) : (
            <div
              className="mt-2 flex justify-center"
              title={ROLE_LABELS[activeRole] || activeRole}
            >
              <div className="w-7 h-7 rounded-full bg-white/[0.08] text-white border border-white/10 flex items-center justify-center text-[10px] font-bold shadow-sm">
                {getRoleInitials(ROLE_LABELS[activeRole] || activeRole)}
              </div>
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="flex-1 min-h-0 px-2 py-3 overflow-y-auto overflow-x-hidden scrollbar-hide">
          <div
            id="sidebar-nav-container"
            className="flex flex-col gap-1 relative"
          >
            {/* Smooth active selection indicator overlay */}
            <div
              style={{
                transform: `translateY(${indicatorStyle.top}px)`,
                height: `${indicatorStyle.height}px`,
                opacity: indicatorStyle.opacity,
                transition:
                  "transform 220ms cubic-bezier(0.16, 1, 0.3, 1), height 220ms cubic-bezier(0.16, 1, 0.3, 1), opacity 150ms ease",
              }}
              className="absolute left-0 right-0 bg-white/[0.12] border-l-[3px] border-sky-400 rounded-r pointer-events-none z-0"
            />

            {allowedTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const subItems = filterSubItemsByRole(tab.id, tab.subItems);
              const hasSubItems = subItems.length > 0;
              const isTabExpanded = expandedTab === tab.id;

              return (
                <div
                  key={tab.id}
                  className={`flex flex-col min-w-0 ${
                    isTabExpanded && isExpanded ? "pb-1" : ""
                  }`}
                >
                  <button
                    id={`sidebar-btn-${tab.id}`}
                    type="button"
                    onClick={() => handleTabClick(tab)}
                    className={`
                      w-full flex items-center gap-3 min-w-0 rounded-md text-sm
                      px-3 py-2.5 cursor-pointer overflow-hidden z-10 relative transition-colors duration-150
                      ${isActive ? SIDEBAR_NAV.active : SIDEBAR_NAV.idle}
                    `}
                  >
                    <svg
                      className="w-5 h-5 shrink-0 min-w-[20px] transition-colors duration-150 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.8}
                        d={tab.icon}
                      />
                    </svg>
                    <span
                      style={{
                        opacity: isExpanded ? 1 : 0,
                        transform: isExpanded
                          ? "translateX(0)"
                          : "translateX(-8px)",
                        transition: "opacity 200ms ease, transform 200ms ease",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                      className="flex-1 min-w-0 text-left truncate leading-normal"
                    >
                      {tab.label}
                    </span>
                    {hasSubItems && isExpanded && (
                      <svg
                        className={`w-3.5 h-3.5 shrink-0 ml-0.5 transition-transform duration-200 ${
                          isTabExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Sub-items list */}
                  {hasSubItems && isExpanded && isTabExpanded && (
                    <div className="mt-1 ml-4 pl-2 border-l border-white/15 flex flex-col gap-0.5 min-w-0">
                      {subItems.map((sub) => {
                        const isSubActive = isActive && activeCtab === sub.id;
                        return (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => handleSubItemClick(tab.id, sub.id)}
                            className={`
                              w-full min-w-0 flex items-center px-3 py-1.5 text-xs text-left rounded-md truncate cursor-pointer overflow-hidden transition-colors
                              ${
                                isSubActive
                                  ? SIDEBAR_NAV.subActive
                                  : SIDEBAR_NAV.subIdle
                              }
                            `}
                          >
                            <span
                              style={{
                                opacity: isExpanded ? 1 : 0,
                                transform: isExpanded
                                  ? "translateX(0)"
                                  : "translateX(-8px)",
                                transition:
                                  "opacity 200ms ease, transform 200ms ease",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                              }}
                              className="truncate block w-full"
                            >
                              {sub.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-2 shrink-0 border-t border-white/10 flex flex-col gap-1">
          <button
            type="button"
            onClick={handleLogout}
            title="Logout"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer overflow-hidden z-10"
          >
            <LogOut className="w-5 h-5 shrink-0 min-w-[20px] text-slate-400" strokeWidth={1.8} />
            <span
              style={{
                opacity: isExpanded ? 1 : 0,
                transform: isExpanded ? "translateX(0)" : "translateX(-8px)",
                transition: "opacity 200ms ease, transform 200ms ease",
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              className="flex-1 min-w-0 text-left truncate leading-normal font-medium"
            >
              Logout
            </span>
          </button>

          <div
            style={{
              opacity: isExpanded ? 1 : 0,
              transform: isExpanded ? "translateY(0)" : "translateY(-4px)",
              transition: "opacity 200ms ease, transform 200ms ease",
              height: isExpanded ? "auto" : "0px",
              overflow: "hidden",
            }}
          >
            <p className="text-[10px] text-center text-white/60 whitespace-nowrap py-1">
              Travel CRM v1.0.0
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content Area: offset with ml-16 (64px) so it stays adjacent to collapsed sidebar */}
      <main className="ml-16 flex-1 min-w-0 min-h-0 flex flex-col overflow-hidden h-screen">
        {/* Header bar */}
        <header className="bg-white h-12 border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={toggleMobileMenu}
              className="md:hidden p-1.5 border border-gray-300 rounded hover:bg-gray-50"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h2 className="text-sm font-semibold text-gray-800 truncate tracking-tight">
              {headerTitle}
            </h2>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Online
            </span>
            <span className="hidden sm:inline font-medium text-gray-700">
              {CURRENT_USER.name}
            </span>
          </div>
        </header>

        {/* Tab Content Container */}
        <div className="flex-1 min-h-0 p-5 overflow-y-auto overflow-x-hidden">
          <Suspense fallback={<AppLoading />}>
            {TabComponent ? (
              <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-xs min-h-[300px]">
                <TabComponent onSwitchTab={handleSwitchTab} />
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                <p className="text-sm">This section is coming soon.</p>
              </div>
            )}
          </Suspense>
        </div>
      </main>
    </div>
  );
};

export default SideBarDashboard;
