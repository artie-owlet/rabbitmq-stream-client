import { expect } from 'chai';

import { DataWriter } from '../../src/messages/data-writer';
import { Commands, RESPONSE_CODE_OK } from '../../src/messages/constants';

import { writeRequestHeader, writeResponseHeader } from './common';

import { CreditRequest }
