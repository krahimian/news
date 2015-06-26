DROP TABLE IF EXISTS `sources`;

CREATE TABLE `sources` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `url` varchar(255) DEFAULT NULL,
  `title` varchar(255) DEFAULT NULL,
  `logo_url` varchar(255) DEFAULT NULL, 
  `etag` varchar(255) DEFAULT NULL,
  `last_modified` datetime DEFAULT NULL, 
  `fetch_failures` int(11) NOT NULL DEFAULT 0,
  `signal_strength_avg` int(11) NOT NULL DEFAULT 1,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  `update_agent` varchar(255) DEFAULT NULL,
  `update_started_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;


DROP TABLE IF EXISTS `posts`;

CREATE TABLE `posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `source_id` int(11) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `content_url` varchar(255) DEFAULT NULL,
  `url` varchar(255) DEFAULT NULL,
  `signal_strength` int(11) NOT NULL DEFAULT 1,
  `hid` varchar(255) NOT NULL,
  `created_at` datetime DEFAULT NULL,
  `updated_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_source_post` (`source_id`, `url`),
  CONSTRAINT `sources` FOREIGN KEY (`source_id`) REFERENCES `sources` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
