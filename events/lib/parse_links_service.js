'use strict';

import { debug } from './index';
import { Link } from 'moonmail-models';
import { LinksParser } from './links_parser';

class ParseLinksService {

  constructor(snsClient, campaignParams) {
    this.campaignParams = campaignParams;
    this.parsedBody = null;
    this.apiHost = process.env.API_HOST;
    this.sendCampaignTopicArn = process.env.ATTACH_RECIPIENTS_TOPIC_ARN;
    this.snsClient = snsClient;
  }

  precompile() {
    debug('= ParseLinksService.precompile', 'Starting precompilation process');
    return this.addTracking()
      .then((result) => {
        return new Promise((resolve, reject) => {
          this.saveLinks(result.campaignLinks)
            .then(() => resolve(result.parsedBody))
            .catch(reject);
        });
      })
      .then((parsedBody) => this.composeCanonicalMessage(parsedBody))
      .then((canonicalMessage) => this.publishToSns(canonicalMessage));
  }

  addTracking() {
    debug('= ParseLinksService.addTracking', 'Adding tracking to body');
    const linksParser = new LinksParser({
      campaignId: this.campaignParams.campaign.id,
      apiHost: this.apiHost
    });
    return linksParser
      .appendOpensPixel(this.campaignParams.campaign.body)
      .then((htmlBody) => linksParser.parseLinks(htmlBody));
  }

  saveLinks(campaignLinks) {
    debug('= ParseLinksService.saveLinks', 'Saving links');
    return Link.save(campaignLinks);
  }

  composeCanonicalMessage(parsedBody) {
    return new Promise((resolve) => {
      let canonicalMessage = Object.assign({}, this.campaignParams);
      Object.assign(canonicalMessage.campaign, {body: parsedBody, precompiled: true});
      resolve(canonicalMessage);
    });
  }

  publishToSns(canonicalMessage) {
    return new Promise((resolve, reject) => {
      debug('= ParseLinksService.publishToSns', 'Sending canonical message', JSON.stringify(canonicalMessage));
      const params = {
        Message: JSON.stringify(canonicalMessage),
        TopicArn: this.sendCampaignTopicArn
      };
      this.snsClient.publish(params, (err, data) => {
        if (err) {
          debug('= ParseLinksService.publishToSns', 'Error sending message', err);
          reject(err);
        } else {
          debug('= ParseLinksService.publishToSns', 'Message sent');
          resolve(data);
        }
      });
    });
  }
}

module.exports.ParseLinksService = ParseLinksService;
