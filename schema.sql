DROP TABLE IF EXISTS `sources`;

CREATE TABLE `sources` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `feed_url` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL, 
  `etag` varchar(255) DEFAULT NULL,
  `last_modified` datetime DEFAULT NULL, 
  `fetch_failures` int(11) NOT NULL DEFAULT 0,
  `score_avg` int(11) NOT NULL DEFAULT 1,
  `social_score_avg` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `update_agent` varchar(255) DEFAULT NULL,
  `update_started_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_source` (`feed_url`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `posts`;

CREATE TABLE `posts` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `source_id` int(11) unsigned NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `embed` TEXT DEFAULT NULL,
  `embed_id` varchar(12) DEFAULT NULL,
  `content_url` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `score` int(11) NOT NULL DEFAULT 1,
  `social_score` int(11) NOT NULL DEFAULT 0,
  `hid` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_source_post` (`source_id`, `url`),
  CONSTRAINT `sources` FOREIGN KEY (`source_id`) REFERENCES `sources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `channels`;

CREATE TABLE `channels` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_channel` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `channels_sources`;

CREATE TABLE `channels_sources` (
  `source_id` int(11) unsigned NOT NULL,
  `channel_id` int(11) unsigned NOT NULL,
  UNIQUE KEY `unique_channel_source` (`channel_id`, `source_id`),
  CONSTRAINT `sources_relation` FOREIGN KEY (`source_id`) REFERENCES `sources` (`id`) ON DELETE CASCADE,
  CONSTRAINT `channels_relation` FOREIGN KEY (`channel_id`) REFERENCES `channels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
