import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { RequireAuth } from "@/components/RequireAuth";
import { LoginPage } from "@/pages/LoginPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { GlobalCalendarPage } from "@/pages/GlobalCalendarPage";
import { WorkspacesPage } from "@/pages/WorkspacesPage";
import { NewWorkspacePage } from "@/pages/NewWorkspacePage";
import { WorkspaceDashboardPage } from "@/pages/workspace/WorkspaceDashboardPage";
import { WorkspaceCalendarPage } from "@/pages/workspace/WorkspaceCalendarPage";
import { QueuePage } from "@/pages/workspace/QueuePage";
import { QueueReviewPage } from "@/pages/workspace/QueueReviewPage";
import { BrandBrainPage } from "@/pages/workspace/BrandBrainPage";
import { AnalyticsPage } from "@/pages/workspace/AnalyticsPage";
import { SettingsLayout } from "@/pages/workspace/settings/SettingsLayout";
import { SettingsGeneralPage } from "@/pages/workspace/settings/SettingsGeneralPage";
import { SettingsConnectionsPage } from "@/pages/workspace/settings/SettingsConnectionsPage";
import { SettingsPersonasPage } from "@/pages/workspace/settings/SettingsPersonasPage";
import { SettingsAudiencesPage } from "@/pages/workspace/settings/SettingsAudiencesPage";
import { SettingsCampaignsPage } from "@/pages/workspace/settings/SettingsCampaignsPage";
import { SettingsQcRulesPage } from "@/pages/workspace/settings/SettingsQcRulesPage";
import { SettingsNotificationsPage } from "@/pages/workspace/settings/SettingsNotificationsPage";
import { SettingsApiKeysPage } from "@/pages/workspace/settings/SettingsApiKeysPage";
import { SettingsAuditPage } from "@/pages/workspace/settings/SettingsAuditPage";
import { ProfilePage } from "@/pages/account/ProfilePage";
import { PreferencesPage } from "@/pages/account/PreferencesPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    path: "/",
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/overview" replace /> },
      { path: "overview", element: <OverviewPage /> },
      { path: "calendar", element: <GlobalCalendarPage /> },
      { path: "workspaces", element: <WorkspacesPage /> },
      { path: "workspaces/new", element: <NewWorkspacePage /> },
      {
        path: "w/:slug",
        children: [
          { index: true, element: <Navigate to="dashboard" replace /> },
          { path: "dashboard", element: <WorkspaceDashboardPage /> },
          { path: "calendar", element: <WorkspaceCalendarPage /> },
          { path: "queue", element: <QueuePage /> },
          { path: "queue/review", element: <QueueReviewPage /> },
          { path: "brain", element: <BrandBrainPage /> },
          { path: "analytics", element: <AnalyticsPage /> },
          {
            path: "settings",
            element: <SettingsLayout />,
            children: [
              { index: true, element: <Navigate to="general" replace /> },
              { path: "general", element: <SettingsGeneralPage /> },
              { path: "connections", element: <SettingsConnectionsPage /> },
              { path: "personas", element: <SettingsPersonasPage /> },
              { path: "audiences", element: <SettingsAudiencesPage /> },
              { path: "campaigns", element: <SettingsCampaignsPage /> },
              { path: "qc-rules", element: <SettingsQcRulesPage /> },
              { path: "notifications", element: <SettingsNotificationsPage /> },
              { path: "api-keys", element: <SettingsApiKeysPage /> },
              { path: "audit", element: <SettingsAuditPage /> },
            ],
          },
        ],
      },
      { path: "account/profile", element: <ProfilePage /> },
      { path: "account/preferences", element: <PreferencesPage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
