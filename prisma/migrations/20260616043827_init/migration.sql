-- CreateTable
CREATE TABLE "carpools" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pickupId" TEXT,
    "dropoffId" TEXT,
    "vehicleLocationId" TEXT,
    "driverId" INTEGER,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "carpools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_members" (
    "id" TEXT NOT NULL,
    "carpoolId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'PARENT',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "carpool_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_invites" (
    "id" TEXT NOT NULL,
    "carpoolId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carpool_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_rounds" (
    "id" TEXT NOT NULL,
    "carpoolId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carpool_rounds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_round_pickup_checklists" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checkedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "carpool_round_pickup_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_round_dropoff_checklists" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "checkedAt" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "carpool_round_dropoff_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carpool_repeat_rules" (
    "id" TEXT NOT NULL,
    "carpoolId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "timeOfDay" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "maxOccurrences" INTEGER,
    "byDay" TEXT,
    "byMonthDay" TEXT,
    "bySetPos" TEXT,
    "byMonth" TEXT,
    "exceptionDates" TEXT,
    "extraDates" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carpool_repeat_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "children" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dob" TIMESTAMP(3),
    "grade" TEXT,
    "relationship" TEXT,
    "parentId" INTEGER NOT NULL,
    "schoolId" TEXT,
    "photoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "children_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_requests" (
    "id" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contact_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "userId1" INTEGER NOT NULL,
    "userId2" INTEGER NOT NULL,
    "alias1" TEXT,
    "alias2" TEXT,
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedBy" INTEGER,
    "blockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'DIRECT',
    "imageId" TEXT,
    "lastMessageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "lastSeenMessageId" TEXT,
    "unreadCount" INTEGER NOT NULL DEFAULT 0,
    "isMuted" BOOLEAN NOT NULL DEFAULT false,
    "mutedUntil" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" INTEGER NOT NULL,
    "content" TEXT,
    "type" TEXT NOT NULL DEFAULT 'TEXT',
    "replyToId" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" TEXT NOT NULL,
    "remarks" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "zipCode" TEXT,
    "note" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "h3IndexLevel5" TEXT,
    "h3IndexLevel6" TEXT,
    "h3IndexLevel7" TEXT,
    "h3IndexLevel8" TEXT,
    "geoHashLevel5" TEXT,
    "geoHashLevel6" TEXT,
    "geoHashLevel7" TEXT,
    "geoHashLevel8" TEXT,
    "s2CellIdLevel5" TEXT,
    "s2CellIdLevel6" TEXT,
    "s2CellIdLevel7" TEXT,
    "s2CellIdLevel8" TEXT,
    "userId" INTEGER,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "location_histories" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "locationId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "location_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_locations" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "locationId" TEXT,
    "remarks" TEXT,
    "isPrimary" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medias" (
    "id" TEXT NOT NULL,
    "userId" INTEGER,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "mimeType" TEXT,
    "previewUrl" TEXT,
    "bytes" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "provider" TEXT,
    "providerPublicId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ttl" TIMESTAMP(3),

    CONSTRAINT "medias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "actionUrl" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_devices" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ONESIGNAL',
    "token" TEXT NOT NULL,
    "platform" TEXT,
    "deviceName" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_devices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "comment" TEXT,
    "reviewerId" INTEGER,
    "subjectId" INTEGER,
    "carpoolId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationId" TEXT,
    "photoId" TEXT,
    "bannerId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "slug" TEXT,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "gender" TEXT,
    "dob" TIMESTAMP(3),
    "emergencyPhone" TEXT,
    "publicPhone" TEXT,
    "publicEmail" TEXT,
    "profilePictureId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isFaceVerified" BOOLEAN NOT NULL DEFAULT false,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastOnlineAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rating" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "authentications" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastPasswordChangeAt" TIMESTAMP(3),
    "wrongPasswordAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "canLogin" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorSecret" TEXT,

    CONSTRAINT "authentications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_mappings" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "user_role_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_transactions" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL,
    "type" TEXT NOT NULL,
    "referenceId" TEXT,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_carpool_member_children" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_carpool_member_children_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_message_attachments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_message_attachments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "carpools_status_idx" ON "carpools"("status");

-- CreateIndex
CREATE INDEX "carpools_isDeleted_idx" ON "carpools"("isDeleted");

-- CreateIndex
CREATE INDEX "carpools_driverId_idx" ON "carpools"("driverId");

-- CreateIndex
CREATE INDEX "carpools_pickupId_idx" ON "carpools"("pickupId");

-- CreateIndex
CREATE INDEX "carpools_dropoffId_idx" ON "carpools"("dropoffId");

-- CreateIndex
CREATE INDEX "carpool_members_carpoolId_idx" ON "carpool_members"("carpoolId");

-- CreateIndex
CREATE INDEX "carpool_members_userId_idx" ON "carpool_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "carpool_members_carpoolId_userId_key" ON "carpool_members"("carpoolId", "userId");

-- CreateIndex
CREATE INDEX "carpool_invites_carpoolId_idx" ON "carpool_invites"("carpoolId");

-- CreateIndex
CREATE INDEX "carpool_invites_userId_idx" ON "carpool_invites"("userId");

-- CreateIndex
CREATE INDEX "carpool_invites_status_idx" ON "carpool_invites"("status");

-- CreateIndex
CREATE UNIQUE INDEX "carpool_invites_carpoolId_userId_key" ON "carpool_invites"("carpoolId", "userId");

-- CreateIndex
CREATE INDEX "carpool_rounds_carpoolId_idx" ON "carpool_rounds"("carpoolId");

-- CreateIndex
CREATE INDEX "carpool_rounds_status_idx" ON "carpool_rounds"("status");

-- CreateIndex
CREATE INDEX "carpool_rounds_scheduledAt_idx" ON "carpool_rounds"("scheduledAt");

-- CreateIndex
CREATE INDEX "carpool_round_pickup_checklists_roundId_idx" ON "carpool_round_pickup_checklists"("roundId");

-- CreateIndex
CREATE INDEX "carpool_round_pickup_checklists_memberId_idx" ON "carpool_round_pickup_checklists"("memberId");

-- CreateIndex
CREATE INDEX "carpool_round_pickup_checklists_childId_idx" ON "carpool_round_pickup_checklists"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "carpool_round_pickup_checklists_roundId_childId_key" ON "carpool_round_pickup_checklists"("roundId", "childId");

-- CreateIndex
CREATE INDEX "carpool_round_dropoff_checklists_roundId_idx" ON "carpool_round_dropoff_checklists"("roundId");

-- CreateIndex
CREATE INDEX "carpool_round_dropoff_checklists_memberId_idx" ON "carpool_round_dropoff_checklists"("memberId");

-- CreateIndex
CREATE INDEX "carpool_round_dropoff_checklists_childId_idx" ON "carpool_round_dropoff_checklists"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "carpool_round_dropoff_checklists_roundId_childId_key" ON "carpool_round_dropoff_checklists"("roundId", "childId");

-- CreateIndex
CREATE UNIQUE INDEX "carpool_repeat_rules_carpoolId_key" ON "carpool_repeat_rules"("carpoolId");

-- CreateIndex
CREATE INDEX "children_parentId_idx" ON "children"("parentId");

-- CreateIndex
CREATE INDEX "children_schoolId_idx" ON "children"("schoolId");

-- CreateIndex
CREATE INDEX "contact_requests_senderId_idx" ON "contact_requests"("senderId");

-- CreateIndex
CREATE INDEX "contact_requests_receiverId_idx" ON "contact_requests"("receiverId");

-- CreateIndex
CREATE INDEX "contact_requests_status_idx" ON "contact_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "contact_requests_senderId_receiverId_key" ON "contact_requests"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "contacts_userId1_idx" ON "contacts"("userId1");

-- CreateIndex
CREATE INDEX "contacts_userId2_idx" ON "contacts"("userId2");

-- CreateIndex
CREATE INDEX "contacts_isBlocked_idx" ON "contacts"("isBlocked");

-- CreateIndex
CREATE UNIQUE INDEX "contacts_userId1_userId2_key" ON "contacts"("userId1", "userId2");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_lastMessageId_key" ON "conversations"("lastMessageId");

-- CreateIndex
CREATE INDEX "conversations_type_idx" ON "conversations"("type");

-- CreateIndex
CREATE INDEX "conversations_updatedAt_idx" ON "conversations"("updatedAt");

-- CreateIndex
CREATE INDEX "conversation_participants_conversationId_idx" ON "conversation_participants"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_idx" ON "conversation_messages"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_messages_senderId_idx" ON "conversation_messages"("senderId");

-- CreateIndex
CREATE INDEX "conversation_messages_conversationId_createdAt_idx" ON "conversation_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "locations_userId_key" ON "locations"("userId");

-- CreateIndex
CREATE INDEX "locations_latitude_longitude_idx" ON "locations"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "locations_country_state_city_idx" ON "locations"("country", "state", "city");

-- CreateIndex
CREATE INDEX "locations_updatedAt_idx" ON "locations"("updatedAt");

-- CreateIndex
CREATE INDEX "location_histories_userId_idx" ON "location_histories"("userId");

-- CreateIndex
CREATE INDEX "location_histories_locationId_idx" ON "location_histories"("locationId");

-- CreateIndex
CREATE INDEX "location_histories_recordedAt_idx" ON "location_histories"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "saved_locations_userId_locationId_key" ON "saved_locations"("userId", "locationId");

-- CreateIndex
CREATE INDEX "medias_userId_idx" ON "medias"("userId");

-- CreateIndex
CREATE INDEX "medias_type_createdAt_idx" ON "medias"("type", "createdAt");

-- CreateIndex
CREATE INDEX "medias_ttl_idx" ON "medias"("ttl");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");

-- CreateIndex
CREATE INDEX "user_devices_userId_idx" ON "user_devices"("userId");

-- CreateIndex
CREATE INDEX "user_devices_isActive_idx" ON "user_devices"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "user_devices_userId_token_key" ON "user_devices"("userId", "token");

-- CreateIndex
CREATE INDEX "reviews_reviewerId_idx" ON "reviews"("reviewerId");

-- CreateIndex
CREATE INDEX "reviews_subjectId_idx" ON "reviews"("subjectId");

-- CreateIndex
CREATE INDEX "reviews_type_idx" ON "reviews"("type");

-- CreateIndex
CREATE INDEX "reviews_carpoolId_idx" ON "reviews"("carpoolId");

-- CreateIndex
CREATE INDEX "schools_name_idx" ON "schools"("name");

-- CreateIndex
CREATE INDEX "schools_locationId_idx" ON "schools"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "users_slug_key" ON "users"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_slug_idx" ON "users"("slug");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_phone_idx" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE INDEX "users_isOnline_idx" ON "users"("isOnline");

-- CreateIndex
CREATE INDEX "users_lastOnlineAt_idx" ON "users"("lastOnlineAt");

-- CreateIndex
CREATE UNIQUE INDEX "authentications_userId_key" ON "authentications"("userId");

-- CreateIndex
CREATE INDEX "authentications_canLogin_idx" ON "authentications"("canLogin");

-- CreateIndex
CREATE INDEX "authentications_lockedUntil_idx" ON "authentications"("lockedUntil");

-- CreateIndex
CREATE INDEX "authentications_lastLoginAt_idx" ON "authentications"("lastLoginAt");

-- CreateIndex
CREATE INDEX "user_role_mappings_userId_idx" ON "user_role_mappings"("userId");

-- CreateIndex
CREATE INDEX "user_role_mappings_role_idx" ON "user_role_mappings"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_mappings_userId_role_key" ON "user_role_mappings"("userId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_userId_key" ON "wallets"("userId");

-- CreateIndex
CREATE INDEX "wallets_status_idx" ON "wallets"("status");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_idx" ON "wallet_transactions"("walletId");

-- CreateIndex
CREATE INDEX "wallet_transactions_walletId_createdAt_idx" ON "wallet_transactions"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "wallet_transactions_type_idx" ON "wallet_transactions"("type");

-- CreateIndex
CREATE INDEX "wallet_transactions_status_idx" ON "wallet_transactions"("status");

-- CreateIndex
CREATE INDEX "_carpool_member_children_B_index" ON "_carpool_member_children"("B");

-- CreateIndex
CREATE INDEX "_message_attachments_B_index" ON "_message_attachments"("B");

-- AddForeignKey
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_pickupId_fkey" FOREIGN KEY ("pickupId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_dropoffId_fkey" FOREIGN KEY ("dropoffId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_vehicleLocationId_fkey" FOREIGN KEY ("vehicleLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpools" ADD CONSTRAINT "carpools_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_members" ADD CONSTRAINT "carpool_members_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "carpools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_members" ADD CONSTRAINT "carpool_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_invites" ADD CONSTRAINT "carpool_invites_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "carpools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_invites" ADD CONSTRAINT "carpool_invites_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_rounds" ADD CONSTRAINT "carpool_rounds_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "carpools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_round_pickup_checklists" ADD CONSTRAINT "carpool_round_pickup_checklists_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "carpool_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_round_pickup_checklists" ADD CONSTRAINT "carpool_round_pickup_checklists_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "carpool_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_round_pickup_checklists" ADD CONSTRAINT "carpool_round_pickup_checklists_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_round_dropoff_checklists" ADD CONSTRAINT "carpool_round_dropoff_checklists_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "carpool_rounds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_round_dropoff_checklists" ADD CONSTRAINT "carpool_round_dropoff_checklists_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "carpool_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_round_dropoff_checklists" ADD CONSTRAINT "carpool_round_dropoff_checklists_childId_fkey" FOREIGN KEY ("childId") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carpool_repeat_rules" ADD CONSTRAINT "carpool_repeat_rules_carpoolId_fkey" FOREIGN KEY ("carpoolId") REFERENCES "carpools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "children" ADD CONSTRAINT "children_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contact_requests" ADD CONSTRAINT "contact_requests_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId1_fkey" FOREIGN KEY ("userId1") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_userId2_fkey" FOREIGN KEY ("userId2") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_lastMessageId_fkey" FOREIGN KEY ("lastMessageId") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_lastSeenMessageId_fkey" FOREIGN KEY ("lastSeenMessageId") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_histories" ADD CONSTRAINT "location_histories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_histories" ADD CONSTRAINT "location_histories_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_locations" ADD CONSTRAINT "saved_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_locations" ADD CONSTRAINT "saved_locations_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medias" ADD CONSTRAINT "medias_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_devices" ADD CONSTRAINT "user_devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_bannerId_fkey" FOREIGN KEY ("bannerId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_profilePictureId_fkey" FOREIGN KEY ("profilePictureId") REFERENCES "medias"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "authentications" ADD CONSTRAINT "authentications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_mappings" ADD CONSTRAINT "user_role_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_carpool_member_children" ADD CONSTRAINT "_carpool_member_children_A_fkey" FOREIGN KEY ("A") REFERENCES "carpool_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_carpool_member_children" ADD CONSTRAINT "_carpool_member_children_B_fkey" FOREIGN KEY ("B") REFERENCES "children"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_message_attachments" ADD CONSTRAINT "_message_attachments_A_fkey" FOREIGN KEY ("A") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_message_attachments" ADD CONSTRAINT "_message_attachments_B_fkey" FOREIGN KEY ("B") REFERENCES "medias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
