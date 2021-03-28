/**
 * @license MIT, imicros.de (c) 2021 Andreas Leinen
 */
"use strict";

/* istanbul ignore file */
 
class Constants {

    // Box codes
    static get INBOX() { return 1; }
    static get OUTBOX() { return 2; }
    // Status codes
    static get STATUS_SEND() { return 100; }
    static get STATUS_RECEIVE() { return 100; }
    static get STATUS_COMPLETE() { return 200; }
    // Error codes
    static get ERROR_NOT_AUTHORIZED() { return 100; }
    static get ERROR_NOT_ACCEPTED() { return 101; }
    static get ERROR_ADD_MESSAGE_OUT() { return 102; }
    static get ERROR_SAVE_MESSAGE_OUT() { return 103; }
    static get ERROR_ADD_MESSAGE_IN() { return 104; }
    static get ERROR_REQUEST_ACCESS() { return 105; }
    static get ERROR_SAVE_MESSAGE_IN() { return 106; }
    static get ERROR_CONFIRM_MESSAGE_SENT() { return 107; }
    static get ERROR_UPDATE_WHITELIST() { return 108; }
    static get ERROR_DATABASE() { return 109; }
    static get ERROR_SAVE_APPENDIX_IN() { return 110; }
    static get ERROR_READ_MESSAGE() { return 111; }
     
}
 
module.exports = Constants;