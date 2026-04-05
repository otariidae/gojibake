export type EnumRule<T extends string> = {
  attributeName: string;
  choices: readonly T[];
  invalidValueDefault?: T;
  missingValueDefault?: T;
  emptyValueDefault?: T;
};

export type IDLProps = Record<string, EnumRule<string>>;

export type IDLAccessors<TProps extends IDLProps> = {
  -readonly [TName in keyof TProps]: TProps[TName]["choices"][number] | null;
};

type IDLElementCtor<TProps extends IDLProps> = {
  readonly properties: TProps;
};

type PropName<TProps extends IDLProps> = Extract<keyof TProps, string>;
const ACCESSORS_INSTALLED = Symbol("idl-attributes-accessors-installed");

function readObservedAttributes<TProps extends IDLProps>(
  ctor: Partial<IDLElementCtor<TProps>>,
): string[] {
  const { properties } = ctor;

  if (properties === undefined) {
    throw new Error(
      "IDLAttributesElement を継承する要素は static properties を定義する必要があります。",
    );
  }

  return Object.values(properties).map(({ attributeName }) => attributeName);
}

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

function normalizePropValue<T extends string>(value: string | null, rule: EnumRule<T>): T | null {
  const { choices, invalidValueDefault, missingValueDefault, emptyValueDefault } = rule;

  if (value === null) {
    return missingValueDefault ?? null;
  }

  if (value === "") {
    return emptyValueDefault ?? invalidValueDefault ?? null;
  }

  if (!isOneOf(value, choices)) {
    return invalidValueDefault ?? null;
  }

  return value;
}

function createAccessorDescriptor<
  TProps extends IDLProps,
  THost extends IDLAttributesElement<TProps>,
  TName extends PropName<TProps>,
>(propertyName: TName): TypedPropertyDescriptor<IDLAccessors<TProps>[TName]> {
  return {
    configurable: true,
    get(this: THost) {
      return this.readProperty(propertyName);
    },
    set(this: THost, value) {
      this.writeProperty(propertyName, value);
    },
  };
}

function installAccessorsIfNeeded<TProps extends IDLProps>(
  ctor: Partial<IDLElementCtor<TProps>>,
): void {
  const { properties } = ctor;

  if (properties === undefined) {
    throw new Error(
      "IDLAttributesElement を継承する要素は static properties を定義する必要があります。",
    );
  }

  const prototype = (ctor as { prototype?: object }).prototype;

  if (prototype === undefined) {
    return;
  }

  const markedPrototype = prototype as { [ACCESSORS_INSTALLED]?: true };

  if (markedPrototype[ACCESSORS_INSTALLED] === true) {
    return;
  }

  const propertyNames = Object.keys(properties) as PropName<TProps>[];
  const descriptors = Object.fromEntries(
    propertyNames.map((propertyName) => [propertyName, createAccessorDescriptor(propertyName)]),
  );

  Object.defineProperties(prototype, descriptors);
  markedPrototype[ACCESSORS_INSTALLED] = true;
}

export abstract class IDLAttributesElement<TProps extends IDLProps> extends HTMLElement {
  static readonly properties: IDLProps;
  readonly #properties: TProps;

  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: 派生クラスをthisで参照するため
    installAccessorsIfNeeded(this);
    // biome-ignore lint/complexity/noThisInStatic: 派生クラスをthisで参照するため
    return readObservedAttributes(this as Partial<IDLElementCtor<IDLProps>>);
  }

  public constructor() {
    super();
    this.#properties = this.readProperties();
  }

  protected readProperty<TName extends PropName<TProps>>(
    propertyName: TName,
  ): IDLAccessors<TProps>[TName] {
    const property = this.#properties[propertyName];
    return normalizePropValue(this.getAttribute(property.attributeName), property);
  }

  protected writeProperty<TName extends PropName<TProps>>(
    propertyName: TName,
    value: IDLAccessors<TProps>[TName],
  ): void {
    const property = this.#properties[propertyName];
    this.setAttribute(property.attributeName, String(value));
  }

  protected static installAccessors<
    TProps extends IDLProps,
    THost extends IDLAttributesElement<TProps>,
  >(prototype: THost, properties: TProps): void {
    const propertyNames = Object.keys(properties) as PropName<TProps>[];
    const descriptors = Object.fromEntries(
      propertyNames.map((propertyName) => [propertyName, createAccessorDescriptor(propertyName)]),
    );

    Object.defineProperties(prototype, descriptors);
  }

  private readProperties(): TProps {
    const ctor = this.constructor as Partial<IDLElementCtor<TProps>>;
    const { properties } = ctor;

    if (properties === undefined) {
      throw new Error(
        "IDLAttributesElement を継承する要素は static properties を定義する必要があります。",
      );
    }

    return properties;
  }
}
