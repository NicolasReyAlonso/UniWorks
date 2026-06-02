from __future__ import annotations

from typing import Any

from pyparsing import (
    CaselessKeyword,
    Dict,
    Group,
    Literal,
    Or,
    ParserElement,
    QuotedString,
    Word,
    alphas,
    alphanums,
    delimitedList,
    oneOf,
    opAssoc,
    infixNotation,
)

from uniback.persistence.models.sysadmin import Identity

ParserElement.enablePackrat()
lparen, rparen, lbracket, rbracket, lcurly, rcurly, dot, equals, hash_ = map(Literal, "()[]{}.=#")
double_quote = Literal('"')
single_quote = Literal("'")
quote = oneOf('" \'')
comparisonop = oneOf("= == != <>")
andop = CaselessKeyword("AND")
orop = CaselessKeyword("OR")
notop = CaselessKeyword("NOT")
inop = CaselessKeyword("IN")
simple_ident = Word(alphas, alphanums + "_")

in_expression = Group(
    simple_ident
    + inop.suppress()
    + lparen.suppress()
    + delimitedList(Or([QuotedString('"'), QuotedString("'")]), ",")
    + rparen.suppress()
).setParseAction(lambda t: {"type": "in", "attribute": t[0][0], "values": t[0][1:]})

authr_expression = infixNotation(
    Or([in_expression, simple_ident, QuotedString('"'), QuotedString("'")]),
    [
        (
            comparisonop,
            2,
            opAssoc.LEFT,
            lambda _s, l, t: {
                "type": "comparison",
                "terms": t.asList()[0][0::2],
                "ops": t.asList()[0][1::2],
            },
        ),
        (
            notop,
            1,
            opAssoc.RIGHT,
            lambda _s, l, t: {
                "type": "not",
                "terms": [t.asList()[0][1]],
                "ops": [t.asList()[0][0]],
            },
        ),
        (
            andop,
            2,
            opAssoc.LEFT,
            lambda _s, l, t: {
                "type": "and",
                "terms": t.asList()[0][0::2],
                "ops": t.asList()[0][1::2],
            },
        ),
        (
            orop,
            2,
            opAssoc.LEFT,
            lambda _s, l, t: {
                "type": "or",
                "terms": t.asList()[0][0::2],
                "ops": t.asList()[0][1::2],
            },
        ),
    ],
    lpar=lparen.suppress(),
    rpar=rparen.suppress(),
)


def string_to_ast(rule: ParserElement, input_: str) -> dict[str, Any]:
    """
    Convert the input string "input_" into an AST, according to "rule"
    """

    def clean_str(us: str) -> str:
        return (
            us.replace("\u2013", "-")
            .replace("\u201d", '"')
            .replace("\u201c", '"')
            .replace("\u2018", "'")
            .replace("\u2019", "'")
            .replace("€", "eur")
            .replace("$", "usd")
        )

    res = rule.parseString(clean_str(input_), parseAll=True)
    res = res.asList()[0]
    while isinstance(res, list):
        res = res[0]
    return res


op_map = {
    "==": lambda a, b: a == b,
    "=": lambda a, b: a == b,
    "!=": lambda a, b: a != b,
    "<>": lambda a, b: a != b,
}


def ast_evaluator(ast: dict[str, Any], ident: Identity) -> bool:
    if "type" in ast:
        if ast["type"] == "in":
            attr = ast["attribute"]
            if attr in ("role", "group", "organization", "identity"):
                if attr in ("role", "group", "organization"):
                    # Use relationship names from Identity model in sysadmin.py
                    # Identity has relationships: groups, organizations, roles
                    # Each is a list of GroupIdentity, OrganizationIdentity, RoleIdentity
                    # Those have backrefs 'group', 'organization', 'role'
                    rel_name = f"{attr}s"
                    members = getattr(ident, rel_name)
                    lst_names = [getattr(m, attr).name for m in members]
                else:
                    lst_names = [ident.name]

                found = False
                for name in lst_names:
                    if name in ast["values"]:
                        found = True
                        break
                return found
            else:
                raise ValueError(f"Attribute {attr} not supported")
        elif ast["type"] in ("not", "and", "or", "comparison"):
            current = None
            for i, e in enumerate(ast["terms"]):
                # If term is a dict, evaluate it. If it's a string, it might be a literal.
                if isinstance(e, dict):
                    following = ast_evaluator(e, ident)
                else:
                    following = e  # Literal value

                if i == 0:
                    current = following
                    op = ast["ops"][i].lower()
                    if op == "not":
                        current = not bool(following)
                else:
                    op = ast["ops"][i - 1].lower()
                    if op == "and":
                        current = current and following
                    elif op == "or":
                        current = current or following
                    else:  # Comparators
                        fn = op_map[op]
                        current = fn(current, following)
            return bool(current)
        else:
            raise ValueError(f"Not supported type {ast['type']}")
    return False
