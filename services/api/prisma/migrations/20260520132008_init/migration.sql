-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "name" TEXT,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "brandColorPrimary" TEXT NOT NULL DEFAULT '#3B82F6',
    "brandColorSecondary" TEXT,
    "brandLogoUrl" TEXT,
    "defaultTimezone" TEXT NOT NULL DEFAULT 'Europe/Madrid',
    "defaultLanguage" TEXT NOT NULL DEFAULT 'es-ES',
    "status" TEXT NOT NULL DEFAULT 'active',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workspace_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceMember" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "invitedAt" DATETIME,
    "acceptedAt" DATETIME,
    CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandBrain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL DEFAULT '',
    "taglineMain" TEXT NOT NULL DEFAULT '',
    "taglinesAlt" TEXT NOT NULL DEFAULT '[]',
    "problemSolved" TEXT NOT NULL DEFAULT '',
    "uniqueValueProp" TEXT NOT NULL DEFAULT '',
    "whatWeAreNot" TEXT NOT NULL DEFAULT '[]',
    "competitors" TEXT NOT NULL DEFAULT '[]',
    "techStackNotes" TEXT,
    "pricingNotes" TEXT,
    "monetizationNotes" TEXT,
    "brandAdjectives" TEXT NOT NULL DEFAULT '[]',
    "howWeTalk" TEXT NOT NULL DEFAULT '',
    "howWeDontTalk" TEXT NOT NULL DEFAULT '[]',
    "copyApprovedExamples" TEXT NOT NULL DEFAULT '[]',
    "copyRejectedExamples" TEXT NOT NULL DEFAULT '[]',
    "claimsAllowed" TEXT NOT NULL DEFAULT '[]',
    "claimsForbidden" TEXT NOT NULL DEFAULT '[]',
    "disclaimersRequired" TEXT NOT NULL DEFAULT '[]',
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT,
    CONSTRAINT "BrandBrain_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BrandAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSizeBytes" INTEGER,
    "thumbnailUrl" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "metadata" TEXT NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BrandAsset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "BuyerPersona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageRange" TEXT,
    "demographics" TEXT,
    "dailyContext" TEXT,
    "pains" TEXT NOT NULL DEFAULT '[]',
    "jtbdFunctional" TEXT,
    "jtbdEmotional" TEXT,
    "jtbdSocial" TEXT,
    "objections" TEXT NOT NULL DEFAULT '[]',
    "workingHooks" TEXT NOT NULL DEFAULT '[]',
    "promise" TEXT,
    "proof" TEXT,
    "preferredCta" TEXT,
    "preferredPlatforms" TEXT NOT NULL DEFAULT '[]',
    "isProTarget" BOOLEAN NOT NULL DEFAULT false,
    "avatarUrl" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BuyerPersona_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Hook" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "personaId" TEXT,
    "format" TEXT,
    "hypothesis" TEXT,
    "testedAt" DATETIME,
    "contentPieceId" TEXT,
    "resultNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Hook_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Hook_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "BuyerPersona" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SocialAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "platformUserId" TEXT,
    "platformPageId" TEXT,
    "platformIgUserId" TEXT,
    "platformAdvertiserId" TEXT,
    "platformChannelId" TEXT,
    "accessTokenEncrypted" TEXT,
    "refreshTokenEncrypted" TEXT,
    "tokenExpiresAt" DATETIME,
    "tokenScope" TEXT,
    "activeFormats" TEXT NOT NULL DEFAULT '[]',
    "isAdsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'healthy',
    "lastError" TEXT,
    "lastPublishedAt" DATETIME,
    "connectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "connectedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SocialAccount_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApiRateLimit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "socialAccountId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "postsUsed" INTEGER NOT NULL DEFAULT 0,
    "postsLimit" INTEGER,
    "quotaUnitsUsed" INTEGER NOT NULL DEFAULT 0,
    "quotaUnitsLimit" INTEGER,
    CONSTRAINT "ApiRateLimit_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "objective" TEXT,
    "startAt" DATETIME,
    "endAt" DATETIME,
    "kpiName" TEXT,
    "kpiTarget" REAL,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ContentPiece" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "externalRef" TEXT,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "targetAccounts" TEXT NOT NULL DEFAULT '[]',
    "buyerPersonaId" TEXT,
    "campaignId" TEXT,
    "frameworkUsed" TEXT,
    "hookUsed" TEXT,
    "conceptId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "qcResults" TEXT NOT NULL DEFAULT '[]',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "notes" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ContentPiece_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ContentPiece_buyerPersonaId_fkey" FOREIGN KEY ("buyerPersonaId") REFERENCES "BuyerPersona" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentPiece_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ContentPiece_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PlatformVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contentPieceId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "mediaType" TEXT,
    "ratio" TEXT,
    "durationS" INTEGER,
    "caption" TEXT,
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "firstComment" TEXT,
    "musicRef" TEXT,
    "ctaText" TEXT,
    "ctaUrl" TEXT,
    "boostEnabled" BOOLEAN NOT NULL DEFAULT false,
    "boostBudgetEur" REAL NOT NULL DEFAULT 0,
    "boostDurationDays" INTEGER,
    "boostDailyBudgetEur" REAL,
    "boostObjective" TEXT,
    "boostAudiencePresetId" TEXT,
    "boostPlatforms" TEXT NOT NULL DEFAULT '[]',
    "scheduledAt" DATETIME,
    "publishedAt" DATETIME,
    "platformPostId" TEXT,
    "platformVideoId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PlatformVariant_contentPieceId_fkey" FOREIGN KEY ("contentPieceId") REFERENCES "ContentPiece" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlatformVariant_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PlatformVariant_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platformVariantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "containerId" TEXT,
    "idempotencyKey" TEXT,
    "scheduledAt" DATETIME,
    "executedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PublishJob_platformVariantId_fkey" FOREIGN KEY ("platformVariantId") REFERENCES "PlatformVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishJob_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishJob_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "SocialAccount" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdCampaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platformVariantId" TEXT,
    "workspaceId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "campaignIdExt" TEXT,
    "adsetIdExt" TEXT,
    "adIdExt" TEXT,
    "totalBudgetEur" REAL,
    "dailyBudgetCents" INTEGER,
    "lifetimeBudgetCents" INTEGER,
    "spendCents" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT,
    "startedAt" DATETIME,
    "endedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AdCampaign_platformVariantId_fkey" FOREIGN KEY ("platformVariantId") REFERENCES "PlatformVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdCampaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AudiencePreset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "geo" TEXT NOT NULL DEFAULT '[]',
    "ageMin" INTEGER,
    "ageMax" INTEGER,
    "languages" TEXT NOT NULL DEFAULT '[]',
    "interests" TEXT NOT NULL DEFAULT '[]',
    "behaviors" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AudiencePreset_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Metric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platformVariantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL,
    "kind" TEXT NOT NULL,
    "reach" INTEGER,
    "impressions" INTEGER,
    "views" INTEGER,
    "likes" INTEGER,
    "comments" INTEGER,
    "shares" INTEGER,
    "saves" INTEGER,
    "profileVisits" INTEGER,
    "follows" INTEGER,
    "watchTimeS" INTEGER,
    "completionRate" REAL,
    "hookRate" REAL,
    "holdRate" REAL,
    "spendCents" INTEGER,
    "cpmCents" INTEGER,
    "cpcCents" INTEGER,
    "ctr" REAL,
    "cpaCents" INTEGER,
    "roas" REAL,
    "raw" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Metric_platformVariantId_fkey" FOREIGN KEY ("platformVariantId") REFERENCES "PlatformVariant" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Metric_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QCRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "appliesToFormats" TEXT NOT NULL DEFAULT '[]',
    "appliesToPlatforms" TEXT NOT NULL DEFAULT '[]',
    "ruleType" TEXT NOT NULL,
    "params" TEXT NOT NULL DEFAULT '{}',
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QCRule_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "action" TEXT NOT NULL,
    "fromValue" TEXT,
    "toValue" TEXT,
    "actorId" TEXT,
    "actorIp" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "NotificationChannel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "events" TEXT NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "NotificationChannel_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkspaceApiKey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "scopes" TEXT NOT NULL DEFAULT '[]',
    "lastUsedAt" DATETIME,
    "expiresAt" DATETIME,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkspaceApiKey_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "WorkspaceApiKey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandBrain_workspaceId_key" ON "BrandBrain"("workspaceId");

-- CreateIndex
CREATE INDEX "BrandAsset_workspaceId_section_idx" ON "BrandAsset"("workspaceId", "section");

-- CreateIndex
CREATE INDEX "SocialAccount_workspaceId_platform_idx" ON "SocialAccount"("workspaceId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "ApiRateLimit_socialAccountId_date_key" ON "ApiRateLimit"("socialAccountId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPiece_externalRef_key" ON "ContentPiece"("externalRef");

-- CreateIndex
CREATE INDEX "ContentPiece_workspaceId_status_idx" ON "ContentPiece"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "ContentPiece_workspaceId_createdAt_idx" ON "ContentPiece"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "PlatformVariant_workspaceId_scheduledAt_idx" ON "PlatformVariant"("workspaceId", "scheduledAt");

-- CreateIndex
CREATE INDEX "PlatformVariant_contentPieceId_idx" ON "PlatformVariant"("contentPieceId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishJob_idempotencyKey_key" ON "PublishJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PublishJob_status_scheduledAt_idx" ON "PublishJob"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Metric_platformVariantId_fetchedAt_idx" ON "Metric"("platformVariantId", "fetchedAt");

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
