// S: só valida.

export class Validator {
  constructor(ruleMap) { this.rules = ruleMap; }
  validate(values) {
    const errors = {};
    for (const field in this.rules) {
      for (const rule of this.rules[field]) {
        const msg = rule(values[field] ?? "", values); // <- passa o objeto inteiro
        if (msg) { errors[field] = msg; break; }
      }
    }
    return errors;
  }
}