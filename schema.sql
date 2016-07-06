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
  `content_url` varchar(255) NOT NULL DEFAULT '',
  `url` varchar(255) NOT NULL DEFAULT '',
  `score` int(11) NOT NULL DEFAULT 1,
  `social_score` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `anger` float DEFAULT '0',
  `disgust` float DEFAULT '0',
  `fear` float DEFAULT '0',
  `joy` float DEFAULT '0',
  `sadness` float DEFAULT '0',
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

DROP TABLE IF EXISTS `concepts`;

CREATE TABLE `concepts` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `text` varchar(255) NOT NULL,
  `geo` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `dbpedia` varchar(255) DEFAULT NULL,
  `freebase` varchar(255) DEFAULT NULL,
  `opencyc` varchar(255) DEFAULT NULL,
  `yago` varchar(255) DEFAULT NULL,
  `crunchbase` varchar(255) DEFAULT NULL,
  `musicBrainz` varchar(255) DEFAULT NULL,
  `geonames` varchar(255) DEFAULT NULL,
  `census` varchar(255) DEFAULT NULL,
  `ciaFactbook` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_concept` (`text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `concepts_posts`;

CREATE TABLE `concepts_posts` (
  `post_id` int(11) unsigned NOT NULL,
  `concept_id` int(11) unsigned NOT NULL,
  `relevance` float NOT NULL,
  UNIQUE KEY `unique_concept_post` (`post_id`, `concept_id`),
  CONSTRAINT `posts_relation` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `concept_relation` FOREIGN KEY (`concept_id`) REFERENCES `concepts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `entities`;

CREATE TABLE `entities` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `text` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL,
  `geo` varchar(255) DEFAULT NULL,
  `website` varchar(255) DEFAULT NULL,
  `dbpedia` varchar(255) DEFAULT NULL,
  `freebase` varchar(255) DEFAULT NULL,
  `opencyc` varchar(255) DEFAULT NULL,
  `yago` varchar(255) DEFAULT NULL,
  `crunchbase` varchar(255) DEFAULT NULL,
  `musicBrainz` varchar(255) DEFAULT NULL,
  `geonames` varchar(255) DEFAULT NULL,
  `census` varchar(255) DEFAULT NULL,
  `ciaFactbook` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_entity` (`text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `entities_posts`;

CREATE TABLE `entities_posts` (
  `post_id` int(11) unsigned NOT NULL,
  `entity_id` int(11) unsigned NOT NULL,
  `relevance` float NOT NULL,
  UNIQUE KEY `unique_entity_post` (`post_id`, `entity_id`),
  CONSTRAINT `posts_relation` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `entity_relation` FOREIGN KEY (`entity_id`) REFERENCES `entities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `keywords`;

CREATE TABLE `keywords` (
  `id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `text` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_entity` (`text`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

DROP TABLE IF EXISTS `keywords_posts`;

CREATE TABLE `keywords_posts` (
  `post_id` int(11) unsigned NOT NULL,
  `keyword_id` int(11) unsigned NOT NULL,
  `relevance` float NOT NULL,
  UNIQUE KEY `unique_keyword_post` (`post_id`, `keyword_id`),
  CONSTRAINT `keywords_posts_relation` FOREIGN KEY (`post_id`) REFERENCES `posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `keyword_relation` FOREIGN KEY (`keyword_id`) REFERENCES `keywords` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
