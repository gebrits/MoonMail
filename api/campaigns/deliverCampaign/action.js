'use strict';

import * as aws from 'aws-sdk';
import { debug } from '../../lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import { DeliverCampaignService } from '../../lib/services/deliver_campaign_service';
import { ApiErrors } from '../../lib/errors';

aws.config.update({region: process.env.SERVERLESS_REGION});
const sns = new aws.SNS();

export function respond(event, cb) {
  debug('= deliverCampaign.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    debug('= deliverCampaign.action', 'Getting campaign');
    const userId = decoded.sub;
    const userPlan = decoded.plan;
    const deliverService = new DeliverCampaignService(sns, {campaign: event.campaign, campaignId: event.campaignId, userId, userPlan});
    deliverService.sendCampaign()
      .then(res => cb(null, res))
      .catch(err => cb(ApiErrors.response(err)));
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
