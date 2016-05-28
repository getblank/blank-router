import {storeTypes, storeDisplayTypes} from 'constants';
import template from 'template';
import uuid from 'node-uuid';

export default class configProcessor {
    static getBaseItem(storeDesc, currentI18n, currentUser, item) {
        let res = { "_id": uuid.v4(), };
        if (storeDesc && storeDesc.props) {
            for (let prop of Object.keys(storeDesc.props)) {
                if (storeDesc.props[prop].default != null) {
                    let defaultValue = storeDesc.props[prop].default;

                    if (typeof defaultValue === 'string') {
                        defaultValue = template.render(defaultValue, {
                            "$i18n": currentI18n,
                            "$user": currentUser,
                            "$item": item || {}
                        });
                    }
                    res[prop] = defaultValue;
                }
            }
        }
        return res;
    }
}