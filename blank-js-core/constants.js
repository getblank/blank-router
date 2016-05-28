/**
 * Created by kib357 on 23/07/15.
 */

import Enum from "utils/enum";

export const iso8601 = /^\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d/;

export const actionsBaseUrl = "/actions/";

export const previewMinWidth = 740;

export const itemStates = Enum(
    "ready",
    "modified",
    "saving",
    "new",
    "loading",
    "notFound",
    "notMatchFilter",
    "deleted",
    "deleting",
    "error"
);

export const processStates = Enum(
    "_archive"
);

export const storeTypes = Enum(
    "single",
    "directory",
    "process",
    "map",
    "notification",
    "workspace"
);

export const propertyTypes = Enum(
    "int",
    "float",
    "bool",
    "string",
    "password",
    "date",
    "ref",
    "refList",
    "virtual",
    "virtualRefList",
    "comments",
    "object",
    "objectList",
    "action",
    "file",
    "fileList",
    "widget"
);

export const widgetTypes = {
    "chartNvD3": "chart/nvd3",
};

export const storeDisplayTypes = Enum(
    "grid",
    "table",
    "list",
    "html",
    "single",
    "dashboard",
    "none"
);

export const displayTypes = Enum(
    "audio",
    "autocomplete",
    "text",
    "textInput",
    "numberInput",
    "floatInput",
    "textArea",
    "checkbox",
    "radio",
    "searchBox",
    "dataTable",
    "checkList",
    "select",
    "datePicker",
    "dateRange",
    "numberRange",
    "timePicker",
    "dateTimePicker",
    "colorPicker",
    "filePicker",
    "masked",
    "password",
    "headerInput",
    "newUsernameInput",
    "code",
    "codeEditor",
    "link",
    "html",
    "form",
    "react",
    "none"
);

export const serverActions = Enum(
    "CONNECTED_EVENT",
    "DISCONNECTED_EVENT",
    //
    "SUBSCRIBED",
    "UNSUBSCRIBED",
    "UPDATE_CONFIG",
    "UPDATE_SERVER_STATE",
    "UPDATE_USER",
    "NOTIFICATIONS_UPDATE",
    "ITEMS_UPDATED",
    "ITEMS_PART_LOADED",

    "ITEM_LOAD_2",
    "ITEM_SAVE_RESPONSE",
    "ITEM_DELETE_RESPONSE",
    "ITEM_ACTION_RESPONSE",

    "STORE_ACTION_RESPONSE",

    "SIGN_IN",
    "SIGN_OUT",
    "SIGN_UP",

    "SEARCH_LOAD_RESULT",
    "SEARCH_LOAD_ERROR",

    "FILE_UPLOAD_RESPONSE"
);

export const userActions = Enum(
    "ROUTE_CHANGE",
    "ITEM_LOCK",
    "SET_PREFERENCE",
    "NOTIFICATIONS_HIGHLIGHT",
    "ITEM_CREATE",
    "ITEM_SAVE_DRAFT",
    "ITEM_SAVE",
    "ITEM_DELETE",
    "ITEM_LOAD",
    "AUDIO_PLAY",
    "AUDIO_STOP",
    "AUDIO_PAUSE",
    "SET_ORDER",
    "SET_FILTER",
    "CLEAR_FILTER",
    "ITEM_SAVE_REQUEST",
    "ITEM_DELETE_REQUEST",
    "ITEM_ACTION_REQUEST",

    "STORE_ACTION_REQUEST",

    "LOAD_ITEMS",

    "SEARCH_LOAD_CALL",

    "FILE_UPLOAD_NEW",
    "FILE_UPLOAD_CANCEL",

    "ACTION_SAVE_DRAFT",
    "ACTION_SELECT"
);

export const userPreferences = Enum(
    "SHOW_NOTIFICATIONS"
);

export const storeEvents = Enum(
    "CHANGED"
);

export const systemStores = {
    "users": "users",
    "profile": "_nav",
    "settings": "_commonSettings"
};

export const conditionOperators = Enum(
    "notContains"
);

export const defaultRoles = {
    "root": "00000000-0000-0000-0000-000000000000",
    "owner": "11111111-1111-1111-1111-111111111111"
};

export const lsKeys = {
    "locale": "-locale-"
};

export const uploadStates = Enum(
    "uploading",
    "aborting",
    "ready",
    "error"
);

export const validityErrors = Enum(
    "INNER_ERROR",
    "TYPE_ERROR",
    "REQUIRED",
    "MIN",
    "MAX",
    "MIN_LENGTH",
    "MAX_LENGTH",
    "PATTERN",
    "MASK",
    "EXPRESSION"
);

export const baseValidators = {
    "required": {
        "type": validityErrors.REQUIRED,
        "message": "{{$i18n.$settings.errors.requiredField}}"
    },
    "min": {
        "type": validityErrors.MIN,
        "message": ">= {{$validatorValue}}"
    },
    "max": {
        "type": validityErrors.MAX,
        "message": "<= {{$validatorValue}}"
    },
    "minLength": {
        "type": validityErrors.MIN_LENGTH
    },
    "maxLength": {
        "type": validityErrors.MAX_LENGTH
    },
    "pattern": {
        "type": validityErrors.PATTERN,
        "message": "{{$i18n.$settings.errors.invalidPattern}}"
    },
    "mask": {
        "type": validityErrors.MASK,
        "message": "{{$i18n.$settings.errors.invalidPattern}}"
    },
    "expression": {
        "type": validityErrors.EXPRESSION,
        "message": "{{$i18n.$settings.errors.invalidPattern}}"
    },
};