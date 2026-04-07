export type EnumRule<T extends string> = {
  attributeName: string;
  choices: readonly T[];
  invalidValueDefault?: T;
  missingValueDefault?: T;
  emptyValueDefault?: T;
};

export type ReflectProps = Record<string, EnumRule<string>>;

export type ReflectAccessors<TProps extends ReflectProps> = {
  -readonly [TName in keyof TProps]: TProps[TName]["choices"][number] | null;
};

type ReflectElementCtor<TProps extends ReflectProps> = {
  readonly properties: TProps;
};

type PropName<TProps extends ReflectProps> = Extract<keyof TProps, string>;
const ACCESSORS_INSTALLED = Symbol("reflect-element-accessors-installed");

function isOneOf<T extends string>(value: string, choices: readonly T[]): value is T {
  return choices.includes(value as T);
}

export abstract class ReflectElement<TProps extends ReflectProps> extends HTMLElement {
  static readonly properties: ReflectProps;
  readonly #properties: TProps;

  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: 派生クラスをthisで参照するため
    ReflectElement.installAccessorsIfNeeded(this);
    // biome-ignore lint/complexity/noThisInStatic: 派生クラスをthisで参照するため
    return ReflectElement.readObservedAttributes(this);
  }

  public constructor() {
    super();
    this.#properties = this.readProperties();
  }

  protected readProperty<TName extends PropName<TProps>>(
    propertyName: TName,
  ): ReflectAccessors<TProps>[TName] {
    const property = this.#properties[propertyName];
    return ReflectElement.normalizePropValue(this.getAttribute(property.attributeName), property);
  }

  protected writeProperty<TName extends PropName<TProps>>(
    propertyName: TName,
    value: ReflectAccessors<TProps>[TName],
  ): void {
    const property = this.#properties[propertyName];
    this.setAttribute(property.attributeName, String(value));
  }

  private static readObservedAttributes(ctor: Partial<ReflectElementCtor<ReflectProps>>): string[] {
    const { properties } = ctor;

    if (properties === undefined) {
      throw new Error(
        "ReflectElement を継承する要素は static properties を定義する必要があります。",
      );
    }

    return Object.values(properties).map(({ attributeName }) => attributeName);
  }

  private static normalizePropValue<T extends string>(
    value: string | null,
    rule: EnumRule<T>,
  ): T | null {
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

  private static createAccessorDescriptor<
    TProps extends ReflectProps,
    THost extends ReflectElement<TProps>,
    TName extends PropName<TProps>,
  >(propertyName: TName): TypedPropertyDescriptor<ReflectAccessors<TProps>[TName]> {
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

  private static installAccessorsIfNeeded(ctor: Partial<ReflectElementCtor<ReflectProps>>): void {
    const { properties } = ctor;

    if (properties === undefined) {
      throw new Error(
        "ReflectElement を継承する要素は static properties を定義する必要があります。",
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

    const propertyNames = Object.keys(properties) as PropName<ReflectProps>[];
    const descriptors = Object.fromEntries(
      propertyNames.map((propertyName) => [
        propertyName,
        ReflectElement.createAccessorDescriptor(propertyName),
      ]),
    );

    Object.defineProperties(prototype, descriptors);
    markedPrototype[ACCESSORS_INSTALLED] = true;
  }

  private readProperties(): TProps {
    const ctor = this.constructor as Partial<ReflectElementCtor<TProps>>;
    const { properties } = ctor;

    if (properties === undefined) {
      throw new Error(
        "ReflectElement を継承する要素は static properties を定義する必要があります。",
      );
    }

    return properties;
  }
}
