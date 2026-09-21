// PHS-48 v2 — primehoststays-mongo first-boot initialisation.
// Runs once by the official mongo image (via mongosh) on an empty data dir.
// Creates the `phs` database roles and per-API users. The root user is created
// by the image itself (MONGO_INITDB_ROOT_USERNAME/_PASSWORD in `admin`); this
// script must not touch it.

// mongosh exposes Node-style process.env; there is no `printenv` here.
for (const name of [
  'MONGO_INITDB_ROOT_USERNAME',
  'MONGO_INITDB_ROOT_PASSWORD',
  'PHS_COM_API_USERNAME',
  'PHS_COM_API_PASSWORD',
  'PHS_ADMIN_API_USERNAME',
  'PHS_ADMIN_API_PASSWORD',
]) {
  if (!process.env[name]) {
    print(`FATAL: required env var ${name} is not set`);
    quit(1);
  }
}

const target = db.getSiblingDB('phs');

// --- Roles -----------------------------------------------------------------
// PhsComApiRole: primehoststays.com-api (public site API). No find-only
// collections; full CRUD on its own collections, no access to admin-only data.
try {
  target.createRole({
    role: 'phsComApiRole',
    roles: [],
    privileges: [
      { resource: { db: 'phs', collection: 'contactForms' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'propertyManagementForms' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'guests' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'owners' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'listings' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'property_photos' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'calendars' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'blog_posts' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'bookingRequests' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'conversations' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'conversationPosts' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'guesty_config' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: '' }, actions: ['listCollections'] },
    ],
  });
} catch (e) {
  if (e.codeName !== 'RoleAlreadyExists') throw e;
}

// PhsAdminApiRole: primehoststays-admin-api. RW on admin-only collections
// (users, reservations, prime_images) plus the shared matrixed collections.
try {
  target.createRole({
    role: 'phsAdminApiRole',
    roles: [],
    privileges: [
      { resource: { db: 'phs', collection: 'users' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'reservations' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'prime_images' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'guests' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'owners' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'listings' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'property_photos' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'calendars' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'blog_posts' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'bookingRequests' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'conversations' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'conversationPosts' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: 'guesty_config' }, actions: ['find', 'insert', 'update', 'remove', 'createIndex'] },
      { resource: { db: 'phs', collection: '' }, actions: ['listCollections'] },
    ],
  });
} catch (e) {
  if (e.codeName !== 'RoleAlreadyExists') throw e;
}

// --- Users -------------------------------------------------------------------
try {
  target.createUser({
    user: process.env.PHS_COM_API_USERNAME,
    pwd: process.env.PHS_COM_API_PASSWORD,
    roles: [{ role: 'phsComApiRole', db: 'phs' }],
  });
} catch (e) {
  if (e.codeName !== 'UserAlreadyExists') throw e;
}

try {
  target.createUser({
    user: process.env.PHS_ADMIN_API_USERNAME,
    pwd: process.env.PHS_ADMIN_API_PASSWORD,
    roles: [{ role: 'phsAdminApiRole', db: 'phs' }],
  });
} catch (e) {
  if (e.codeName !== 'UserAlreadyExists') throw e;
}

print('PHS-48: phs roles and API users initialised');
