-- ══════════════════════════════════════════════════════════════════
--  JODOHKU — MySQL Schema
--  Versi: Phase 1 — The Magnum Opus Engine
--  © 2026 Asas Technologies (M) Sdn Bhd
--
--  Cara guna:
--    mysql -u root -p < jodohku_schema.sql
--  atau import terus dalam phpMyAdmin / TablePlus
-- ══════════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS jodohku_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jodohku_db;

-- ══════════════════════════════════════════════════════════════════
--  1. USERS
--  Jadual utama — semua maklumat pengguna + psikometrik
--  Maps to: S.uid, S.name, S.tier, S.psyScore, dll
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id                INT           NOT NULL AUTO_INCREMENT,
  uid               VARCHAR(20)   NOT NULL COMMENT 'JDK-XXXXX',
  phone             VARCHAR(20)   NOT NULL COMMENT 'Format: 01XXXXXXXX',
  full_name         VARCHAR(100)  NOT NULL,
  dob               VARCHAR(10)   NOT NULL DEFAULT '' COMMENT 'YYYY-MM-DD',
  age               INT           NOT NULL DEFAULT 0,
  gender            VARCHAR(15)   NOT NULL DEFAULT 'Lelaki' COMMENT 'Lelaki / Perempuan',
  status            VARCHAR(30)   NOT NULL DEFAULT 'Bujang' COMMENT 'Bujang / Janda / Duda',
  state_residence   VARCHAR(50)   NOT NULL DEFAULT '',
  email             VARCHAR(120)  NOT NULL DEFAULT '',
  ic_last4          VARCHAR(4)    NOT NULL DEFAULT '',

  -- Foto profil
  photo_url         TEXT          COMMENT 'URL S3 atau base64 (demo sahaja)',

  -- Progressive Profiling (dari modal selepas daftar)
  education         VARCHAR(50)   NOT NULL DEFAULT '' COMMENT 'SPM/Diploma/Degree/Master/PhD/Profesional',
  occupation        VARCHAR(50)   NOT NULL DEFAULT '' COMMENT 'Doktor/Jurutera/Akauntan/dll',
  income_class      VARCHAR(10)   NOT NULL DEFAULT '' COMMENT 'B40/M40/T20/VVIP',
  wingman_verdict   TEXT          COMMENT 'Analisis AI Wingman — teks santai',

  -- Tier & Langganan
  tier              VARCHAR(30)   NOT NULL DEFAULT 'Basic' COMMENT 'Basic/Silver/Gold/Platinum/Sovereign',
  is_premium        TINYINT(1)    NOT NULL DEFAULT 0,
  msg_count         INT           NOT NULL DEFAULT 0 COMMENT 'Bilangan mesej dihantar (untuk had Free)',

  -- Psikometrik 30 Dimensi
  psy_done          TINYINT(1)    NOT NULL DEFAULT 0,
  psy_score         FLOAT         NOT NULL DEFAULT 0.0 COMMENT 'Skor 0-10',
  psy_type          VARCHAR(100)  NOT NULL DEFAULT '' COMMENT 'Jenis personaliti',
  psy_desc          TEXT          COMMENT 'Deskripsi personaliti panjang',
  psy_traits        JSON          COMMENT '["Spiritual","Komunikatif",...]',
  psy_dims          JSON          COMMENT '{"agama":9,"keluarga":8,...}',
  psy_answers       JSON          COMMENT 'Jawapan mentah {q1:{val,score},...}',
  psy_custom_text   TEXT          COMMENT 'Keperibadian tambahan dari pengguna (max 500 aksara)',

  -- Pioneer & Status
  is_pioneer        TINYINT(1)    NOT NULL DEFAULT 0,
  is_verified       TINYINT(1)    NOT NULL DEFAULT 0,
  is_active         TINYINT(1)    NOT NULL DEFAULT 1,
  is_banned         TINYINT(1)    NOT NULL DEFAULT 0,

  -- Timestamp
  created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_active       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_users_uid   (uid),
  UNIQUE KEY uq_users_phone (phone),
  INDEX idx_users_gender    (gender),
  INDEX idx_users_tier      (tier),
  INDEX idx_users_active    (is_active, is_banned)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Jadual pengguna utama Jodohku';


-- ══════════════════════════════════════════════════════════════════
--  2. OTP_RECORDS
--  Kod OTP WhatsApp — luput dalam 5 minit
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS otp_records (
  id          INT           NOT NULL AUTO_INCREMENT,
  phone       VARCHAR(20)   NOT NULL,
  otp_code    VARCHAR(6)    NOT NULL,
  is_used     TINYINT(1)    NOT NULL DEFAULT 0,
  attempts    INT           NOT NULL DEFAULT 0,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME      NOT NULL DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)),

  PRIMARY KEY (id),
  INDEX idx_otp_phone      (phone),
  INDEX idx_otp_expires    (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Rekod OTP WhatsApp — auto expire 5 minit';


-- ══════════════════════════════════════════════════════════════════
--  3. SUBSCRIPTIONS
--  Langganan aktif pengguna — satu rekod per pengguna
--  Maps to: S.subStart, S.subEnd
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS subscriptions (
  id          INT           NOT NULL AUTO_INCREMENT,
  user_id     INT           NOT NULL,
  tier        VARCHAR(30)   NOT NULL DEFAULT 'Silver (7-Hari)',
  status      VARCHAR(20)   NOT NULL DEFAULT 'Trial' COMMENT 'Trial/Active/Expired',
  price_paid  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  started_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME      NULL,

  PRIMARY KEY (id),
  UNIQUE KEY uq_sub_user (user_id),
  CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sub_expires (expires_at),
  INDEX idx_sub_status  (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Langganan pengguna — Silver/Gold/Platinum/Sovereign';


-- ══════════════════════════════════════════════════════════════════
--  4. MATCHES
--  Padanan dua hala (mutual LIKE)
--  Maps to: S.matches[], S.chatDays, S.advanceRequested
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS matches (
  id                   INT           NOT NULL AUTO_INCREMENT,
  match_uid            VARCHAR(30)   NOT NULL COMMENT 'mid_XXXXXXXXXX',
  user1_id             INT           NOT NULL,
  user2_id             INT           NOT NULL,
  compatibility_score  FLOAT         NOT NULL DEFAULT 0.0,
  ai_verdict           TEXT          COMMENT 'Analisis AI untuk padanan ini',
  is_active            TINYINT(1)    NOT NULL DEFAULT 1,
  advance_requested    TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'S.advanceRequested',
  advance_approved     TINYINT(1)    NOT NULL DEFAULT 0,
  chat_day_list        JSON          COMMENT '["2026-03-01","2026-03-02"] — S.chatDays',
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_match_uid (match_uid),
  CONSTRAINT fk_match_user1 FOREIGN KEY (user1_id) REFERENCES users(id),
  CONSTRAINT fk_match_user2 FOREIGN KEY (user2_id) REFERENCES users(id),
  INDEX idx_match_user1 (user1_id),
  INDEX idx_match_user2 (user2_id),
  INDEX idx_match_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Padanan dua hala yang berjaya';


-- ══════════════════════════════════════════════════════════════════
--  5. MATCH_ACTIONS
--  Rekod setiap LIKE / PASS
--  POST /matchmaking/action
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS match_actions (
  id            INT           NOT NULL AUTO_INCREMENT,
  user_id       INT           NOT NULL,
  candidate_id  VARCHAR(20)   NOT NULL COMMENT 'uid calon (string)',
  action        VARCHAR(10)   NOT NULL COMMENT 'LIKE / PASS',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  CONSTRAINT fk_action_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_action_user      (user_id),
  INDEX idx_action_candidate (candidate_id),
  INDEX idx_action_type      (action)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Log tindakan LIKE/PASS pengguna';


-- ══════════════════════════════════════════════════════════════════
--  6. CHAT_MESSAGES
--  Semua mesej dalam setiap padanan
--  Maps to: S.history[matchId]
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_messages (
  id            INT           NOT NULL AUTO_INCREMENT,
  match_id      VARCHAR(30)   NOT NULL COMMENT 'match_uid',
  sender_uid    VARCHAR(20)   NOT NULL,
  message_text  TEXT          NOT NULL,
  is_system     TINYINT(1)    NOT NULL DEFAULT 0 COMMENT 'Mesej sistem/admin',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_chat_match    (match_id),
  INDEX idx_chat_sender   (sender_uid),
  INDEX idx_chat_created  (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Mesej chat dalam setiap padanan';


-- ══════════════════════════════════════════════════════════════════
--  7. DAILY_FEEDS
--  Cache feed harian per pengguna — reset setiap hari jam 8 pagi
--  GET /matchmaking/daily-feed/{uid}
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS daily_feeds (
  id                   INT           NOT NULL AUTO_INCREMENT,
  user_uid             VARCHAR(20)   NOT NULL,
  candidate_uid        VARCHAR(20)   NOT NULL,
  compatibility_score  FLOAT         NOT NULL DEFAULT 0.0,
  ai_verdict           TEXT,
  feed_date            VARCHAR(10)   NOT NULL COMMENT 'YYYY-MM-DD',
  is_actioned          TINYINT(1)    NOT NULL DEFAULT 0,
  created_at           DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  INDEX idx_feed_user     (user_uid),
  INDEX idx_feed_date     (feed_date),
  INDEX idx_feed_user_date (user_uid, feed_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Cache cadangan calon harian';


-- ══════════════════════════════════════════════════════════════════
--  8. PAYMENTS
--  Rekod semua transaksi pembayaran
--  POST /payment/create-bill, /payment/callback
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS payments (
  id            INT             NOT NULL AUTO_INCREMENT,
  user_uid      VARCHAR(20)     NOT NULL,
  tier          VARCHAR(30)     NOT NULL COMMENT 'Silver/Gold/Platinum/Sovereign',
  amount        DECIMAL(10,2)   NOT NULL,
  currency      VARCHAR(5)      NOT NULL DEFAULT 'MYR',
  method        VARCHAR(30)     NOT NULL DEFAULT 'ToyyibPay',
  billcode      VARCHAR(100)    NOT NULL DEFAULT '',
  status        VARCHAR(20)     NOT NULL DEFAULT 'Pending' COMMENT 'Pending/Completed/Failed',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at  DATETIME        NULL,

  PRIMARY KEY (id),
  INDEX idx_pay_user    (user_uid),
  INDEX idx_pay_status  (status),
  INDEX idx_pay_billcode (billcode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Rekod pembayaran ToyyibPay';


-- ══════════════════════════════════════════════════════════════════
--  9. PIONEER_STATS
--  Kaunter Pioneer VVIP — GET /stats/pioneer-quota
-- ══════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS pioneer_stats (
  id           INT  NOT NULL AUTO_INCREMENT,
  total_quota  INT  NOT NULL DEFAULT 3000,
  claimed      INT  NOT NULL DEFAULT 0,

  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Statistik kuota Pioneer VVIP';


-- ══════════════════════════════════════════════════════════════════
--  DATA PERMULAAN (SEED)
-- ══════════════════════════════════════════════════════════════════

-- Pioneer stats
INSERT INTO pioneer_stats (total_quota, claimed) VALUES (3000, 0);

-- Demo users — sama dengan MOCK_F dan MOCK_M dalam frontend
INSERT INTO users (uid, phone, full_name, age, gender, status, tier, is_premium, psy_done, psy_score, psy_type, psy_traits, psy_dims, education, occupation, income_class, is_active) VALUES
-- Perempuan
('JDK-9120', '0191110001', 'Cik Puan Sarah',  32, 'Perempuan', 'Janda',  'Gold',     1, 1, 8.8, 'Pasangan Seimbang & Matang',    '["Penyabar","Rajin Memasak","Suka Membaca","Kemas"]',                '{"agama":9,"keluarga":9,"kewangan":8,"komunikasi":8,"emosi":9}', 'Degree',  'Pensyarah',      'M40', 1),
('JDK-4055', '0191110002', 'Cik Puan Nurul',  28, 'Perempuan', 'Bujang', 'Silver',   0, 1, 8.2, 'Pasangan Seimbang & Matang',    '["Perancang","Analitikal","Suka Belajar","Kreatif"]',                '{"agama":7,"keluarga":8,"kewangan":9,"komunikasi":7,"emosi":8}', 'Master',  'Akauntan',       'M40', 1),
('JDK-7203', '0191110003', 'Cik Puan Aisyah', 35, 'Perempuan', 'Janda',  'Gold',     1, 1, 7.9, 'Pemimpin Keluarga Berwibawa',   '["Dermawan","Mesra","Suka Mengembara","Aktif Komuniti"]',            '{"agama":8,"keluarga":8,"kewangan":7,"komunikasi":8,"emosi":8}', 'Degree',  'Sektor Awam',    'M40', 1),
('JDK-2891', '0191110004', 'Cik Puan Hafizah',30, 'Perempuan', 'Bujang', 'Gold',     1, 1, 7.8, 'Pasangan Seimbang & Matang',    '["Optimis","Sihat","Ceria","Disiplin"]',                             '{"agama":7,"keluarga":7,"kewangan":8,"komunikasi":8,"emosi":7}', 'Degree',  'Doktor/Medikal', 'T20', 1),
('JDK-5514', '0191110005', 'Cik Puan Rozita', 38, 'Perempuan', 'Janda',  'Platinum', 1, 1, 7.5, 'Pemimpin Keluarga Berwibawa',   '["Setia","Bijak Kewangan","Introvert","Penyayang"]',                 '{"agama":8,"keluarga":9,"kewangan":9,"komunikasi":6,"emosi":7}', 'Master',  'Business',       'T20', 1),
-- Lelaki
('JDK-4421', '0191110006', 'Encik Ahmad',     34, 'Lelaki',    'Bujang', 'Gold',     1, 1, 8.7, 'Pemimpin Keluarga Berwibawa',   '["Bertanggungjawab","Spiritual","Kerjaya Stabil","Suka Memasak"]',  '{"agama":9,"keluarga":9,"kewangan":8,"komunikasi":8,"emosi":8}', 'Degree',  'Jurutera',       'M40', 1),
('JDK-6630', '0191110007', 'Encik Hakim',     29, 'Lelaki',    'Bujang', 'Silver',   0, 1, 8.1, 'Pasangan Seimbang & Matang',    '["Matang","Sportif","Perancang","Komunikatif"]',                     '{"agama":7,"keluarga":8,"kewangan":8,"komunikasi":8,"emosi":7}', 'Diploma', 'Sales/Marketing','B40', 1),
('JDK-1182', '0191110008', 'Encik Faris',     37, 'Lelaki',    'Duda',   'Gold',     1, 1, 8.0, 'Pasangan Seimbang & Matang',    '["Usahawan","Pengembara","Penyayang Keluarga","Stabil"]',            '{"agama":8,"keluarga":8,"kewangan":9,"komunikasi":7,"emosi":8}', 'Degree',  'Business',       'T20', 1),
('JDK-8845', '0191110009', 'Encik Rizal',     32, 'Lelaki',    'Bujang', 'Silver',   0, 1, 7.7, 'Penjelajah Hubungan',           '["Sukarelawan","Toleran","Suka Sejarah","Rajin"]',                   '{"agama":7,"keluarga":7,"kewangan":7,"komunikasi":8,"emosi":7}', 'Degree',  'Sektor Awam',    'M40', 1),
('JDK-3309', '0191110010', 'Encik Haziq',     40, 'Lelaki',    'Duda',   'Platinum', 1, 1, 7.6, 'Pemimpin Keluarga Berwibawa',   '["Pendiam","Penyayang","Kemas","Berkebun"]',                         '{"agama":8,"keluarga":8,"kewangan":8,"komunikasi":6,"emosi":8}', 'Master',  'Peguam',         'T20', 1);

-- Subscription trial untuk demo users
INSERT INTO subscriptions (user_id, tier, status, price_paid, started_at, expires_at)
SELECT id, tier, 'Active', 0.00, NOW(), DATE_ADD(NOW(), INTERVAL 30 DAY)
FROM users;


-- ══════════════════════════════════════════════════════════════════
--  PAPARAN BERGUNA (VIEWS) — untuk admin dashboard
-- ══════════════════════════════════════════════════════════════════

-- Ringkasan pengguna aktif
CREATE OR REPLACE VIEW v_user_summary AS
SELECT
  u.uid,
  u.full_name,
  u.gender,
  u.age,
  u.tier,
  u.is_premium,
  u.psy_done,
  ROUND(u.psy_score, 1) AS psy_score,
  u.occupation,
  u.income_class,
  s.status AS sub_status,
  s.expires_at,
  u.created_at
FROM users u
LEFT JOIN subscriptions s ON s.user_id = u.id
WHERE u.is_active = 1 AND u.is_banned = 0;

-- Statistik platform
CREATE OR REPLACE VIEW v_platform_stats AS
SELECT
  (SELECT COUNT(*) FROM users)                          AS total_users,
  (SELECT COUNT(*) FROM users WHERE is_premium = 1)    AS premium_users,
  (SELECT COUNT(*) FROM users WHERE psy_done = 1)      AS psy_completed,
  (SELECT COUNT(*) FROM matches)                        AS total_matches,
  (SELECT COUNT(*) FROM chat_messages)                  AS total_messages,
  (SELECT SUM(amount) FROM payments WHERE status = 'Completed') AS total_revenue_myr,
  (SELECT claimed FROM pioneer_stats LIMIT 1)           AS pioneer_claimed,
  (SELECT total_quota - claimed FROM pioneer_stats LIMIT 1) AS pioneer_remaining;


-- ══════════════════════════════════════════════════════════════════
--  SELESAI
--  Jalankan: mysql -u root -p jodohku_db < jodohku_schema.sql
-- ══════════════════════════════════════════════════════════════════
