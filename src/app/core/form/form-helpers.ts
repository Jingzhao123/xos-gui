export interface IXosFormHelpersService {
  _getFieldFormat(value: any): string;
}

export class XosFormHelpers implements IXosFormHelpersService {
  static $inject = [];

  public _getFieldFormat = (value) => {
    if (angular.isArray(value)) {
      return 'array';
    }

    // check if is date
    if (
      angular.isDate(value) ||
      (
        !Number.isNaN(Date.parse(value)) && // Date.parse is a number
        /^\d+-\d+-\d+\D\d+:\d+:\d+\.\d+\D/.test(value) // the format match ISO dates
      )) {
      return 'date';
    }

    // check if is boolean
    // isNaN(false) = false, false is a number (0), true is a number (1)
    if (typeof value  === 'boolean') {
      return 'boolean';
    }

    // check if a string is an email
    if (this._isEmail(value)) {
      return 'email';
    }

    // if null return string
    if (angular.isString(value) || value === null) {
      return 'text';
    }

    return typeof value;
  };

  private _isEmail = (text) => {
    const re = /(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))/;
    return re.test(text);
  };
}

