-- 密码管理器数据库架构设计
-- 采用 SQLite，确保数据完整性和安全性

-- =====================================
-- 用户表（虽然是单用户应用，但保留扩展性）
-- =====================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    master_password_hash TEXT NOT NULL,  -- Argon2 哈希
    salt TEXT NOT NULL,                  -- 密钥派生盐值
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 标签表
-- =====================================
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- 标签名称
    color TEXT DEFAULT '#18a058',        -- 标签颜色
    description TEXT,                    -- 标签描述
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 密码条目表（核心表）
-- =====================================
CREATE TABLE IF NOT EXISTS password_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,                 -- 条目标题
    username TEXT,                       -- 用户名（加密存储）
    password TEXT NOT NULL,              -- 密码（加密存储）
    url TEXT,                           -- 网站URL
    description TEXT,                    -- 描述（加密存储）
    encryption_iv TEXT NOT NULL,        -- AES-GCM 初始化向量
    encryption_tag TEXT NOT NULL,       -- AES-GCM 认证标签
    is_favorite BOOLEAN DEFAULT FALSE,   -- 是否收藏
    last_used_at DATETIME,              -- 最后使用时间
    password_strength INTEGER DEFAULT 0, -- 密码强度评分
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 密码条目表的索引
CREATE INDEX IF NOT EXISTS idx_title ON password_entries(title);
CREATE INDEX IF NOT EXISTS idx_url ON password_entries(url);
CREATE INDEX IF NOT EXISTS idx_last_used ON password_entries(last_used_at);
CREATE INDEX IF NOT EXISTS idx_favorite ON password_entries(is_favorite);

-- =====================================
-- 密码条目与标签关联表（多对多关系）
-- =====================================
CREATE TABLE IF NOT EXISTS entry_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (entry_id) REFERENCES password_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    
    -- 唯一约束防止重复关联
    UNIQUE(entry_id, tag_id)
);

-- 条目标签关联表的索引
CREATE INDEX IF NOT EXISTS idx_entry_id ON entry_tags(entry_id);
CREATE INDEX IF NOT EXISTS idx_tag_id ON entry_tags(tag_id);

-- =====================================
-- 密码历史记录表（用于密码变更追踪）
-- =====================================
CREATE TABLE IF NOT EXISTS password_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL,
    old_password TEXT NOT NULL,          -- 旧密码（加密存储）
    encryption_iv TEXT NOT NULL,        -- AES-GCM 初始化向量
    encryption_tag TEXT NOT NULL,       -- AES-GCM 认证标签
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (entry_id) REFERENCES password_entries(id) ON DELETE CASCADE
);

-- 密码历史表的索引
CREATE INDEX IF NOT EXISTS idx_entry_history ON password_history(entry_id);
CREATE INDEX IF NOT EXISTS idx_changed_at ON password_history(changed_at);

-- =====================================
-- 应用设置表
-- =====================================
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- =====================================
-- 审计日志表（安全追踪）
-- =====================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,                -- 操作类型：CREATE, READ, UPDATE, DELETE
    table_name TEXT NOT NULL,            -- 操作的表名
    record_id INTEGER,                   -- 操作的记录ID
    details TEXT,                        -- 操作详情（JSON格式）
    ip_address TEXT,                     -- IP地址（如果有网络操作）
    user_agent TEXT,                     -- 用户代理
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 审计日志表的索引
CREATE INDEX IF NOT EXISTS idx_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_created_at ON audit_logs(created_at);

-- =====================================
-- 初始化默认数据
-- =====================================

-- 插入默认标签
INSERT OR IGNORE INTO tags (name, color, description) VALUES 
('工作', '#2080f0', '工作相关的账户'),
('个人', '#18a058', '个人使用的账户'),
('社交', '#f0a020', '社交平台账户'),
('金融', '#d03050', '银行、支付等金融账户'),
('购物', '#7c3aed', '电商、购物平台'),
('学习', '#0ea5e9', '教育、学习平台'),
('娱乐', '#10b981', '游戏、娱乐平台');

-- 插入默认设置
INSERT OR IGNORE INTO app_settings (key, value, description) VALUES 
('password_generator_length', '16', '默认密码生成长度'),
('password_generator_include_uppercase', 'true', '密码包含大写字母'),
('password_generator_include_lowercase', 'true', '密码包含小写字母'),
('password_generator_include_numbers', 'true', '密码包含数字'),
('password_generator_include_symbols', 'true', '密码包含特殊符号'),
('auto_lock_timeout', '900', '自动锁定超时时间（秒）'),
('theme_mode', 'auto', '主题模式：light/dark/auto'),
('backup_enabled', 'true', '是否启用自动备份'),
('backup_interval', '86400', '备份间隔（秒）');
