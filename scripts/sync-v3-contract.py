#!/usr/bin/env python3
"""Refresh the compact writable schemas and route manifest from GLPI v3 OpenAPI JSON.

Usage: python3 scripts/sync-v3-contract.py /path/to/doc.json [--check]
"""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = json.loads((ROOT / 'scripts/v3-base-schemas.json').read_text())
SCHEMAS = set('''Ticket Problem Change Followup TicketTask ProblemTask ChangeTask Solution Computer Software NetworkEquipment Printer Monitor Phone KBArticle Contract Supplier Location Project User Group ITILCategory Entity Document Antivirus Budget Certificate Certificate_Item ChangeCost ChangeValidation Contact ContractCost Contract_Item Document_Item Infocom ITIL_Project KBArticleComment License PDU Peripheral ProblemCost ProjectTask Rack RecurringChange RecurringTicket SoftwareInstallation TicketCost TicketValidation Unmanaged UserPreferences VirtualMachine Volume'''.split())


def compact(document, schema, depth=0):
    if '$ref' in schema:
        schema = document['components']['schemas'][schema['$ref'].split('/')[-1]]
    if schema.get('readOnly'):
        return None
    kind = schema.get('type', 'object')
    if kind == 'object':
        if depth >= 4:
            return {'type': 'object'}
        properties = {key: value for key, item in schema.get('properties', {}).items()
                      if (value := compact(document, item, depth + 1)) is not None}
        result = {'type': 'object'}
        if properties:
            result['properties'] = properties
            result['additionalProperties'] = False
        required = [key for key in schema.get('required', []) if key in properties]
        if required:
            result['required'] = required
        return result
    if kind == 'array':
        return {'type': 'array', 'items': compact(document, schema.get('items', {}), depth + 1) or {}}
    result = {'type': kind}
    for key in ('enum', 'minimum', 'maximum', 'minLength', 'maxLength', 'pattern'):
        if key in schema:
            result[key] = schema[key]
    return result


def emit(path, value, check):
    rendered = json.dumps(value, indent=2, sort_keys=True) + '\n'
    if check:
        if not path.exists() or path.read_text() != rendered:
            raise SystemExit(f'{path} is stale; run sync-v3-contract.py without --check')
    else:
        path.write_text(rendered)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('openapi', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    document = json.loads(args.openapi.read_text())
    missing = SCHEMAS - document['components']['schemas'].keys()
    if missing:
        raise SystemExit(f'Missing v3 schemas: {sorted(missing)}')
    emit(ROOT / 'src/v3-schemas.json', {name: BASE.get(name) or compact(document, document['components']['schemas'][name]) for name in sorted(SCHEMAS)}, args.check)
    emit(ROOT / 'src/v3-routes.json', {path: sorted(method.upper() for method in operations if method in ('get', 'post', 'patch', 'delete'))
                                       for path, operations in document['paths'].items()}, args.check)


if __name__ == '__main__':
    main()
