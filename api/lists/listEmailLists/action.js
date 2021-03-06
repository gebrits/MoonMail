'use strict';

import { List } from 'moonmail-models';
import { debug } from '../../lib/logger';
import decrypt from '../../lib/auth-token-decryptor';
import { ApiErrors } from '../../lib/errors';
import omitEmpty from 'omit-empty';

export function respond(event, cb) {
  debug('= listEmailLists.action', JSON.stringify(event));
  decrypt(event.authToken).then((decoded) => {
    const options = {
      limit: 10
    };
    if (event.options) {
      Object.assign(options, omitEmpty(event.options));
    }
    List.allBy('userId', decoded.sub, options).then(list => {
      debug('= listEmailLists.action', 'Success');
      return cb(null, list);
    })
    .catch(e => {
      debug('= listEmailLists.action', e);
      return cb(ApiErrors.response(e));
    });
  })
  .catch(err => cb(ApiErrors.response(err), null));
}
