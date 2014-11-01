Cobotti ircbot:

requires openshift nodejs-app with mysql to run. Currently supports adding/removing and listing quotes and has a dynamic channel list that can be updated during runtime.

!def NAME to read a quote, !defadd NAME QUOTE to add a new one, !defrem NAME to remove a quote.
!list for a list of all quotes. !channeladd #CHANNEL to join a new channel, !channelrem #CHANNEL to leave. !source for the github link.

Database structure:

Needs database cobotti on the server, mysql code:

CREATE DATABASE IF NOT EXISTS `cobotti`;

CREATE TABLE IF NOT EXISTS `botdata` (
  `name` varchar(50) NOT NULL,
  `server` varchar(50) NOT NULL DEFAULT 'quakenet.org',
  PRIMARY KEY (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `channels` (
  `channel` varchar(50) NOT NULL,
  PRIMARY KEY (`channel`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `quotes` (
  `id` varchar(30) NOT NULL,
  `quote` varchar(500) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;