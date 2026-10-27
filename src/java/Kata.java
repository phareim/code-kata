// The fixed half of the bridge between Java code and the page (src/java/compose.ts writes the other half: KataWorld,
// and Main.KataGen inside the code's class, where it can reach the code's own classes). The Java objects are mirrored
// to JavaScript objects the worker (src/run/worker.js, javaBridge) keeps by id: the stage, vis() and the task's check
// read the mirrors, and a check's call into the code converts its arguments back. Every object that has been across
// keeps its id, so it stays the same mirror.
final class KataBridge {
  static Main code;
  static final ArrayList<Object> objs = new ArrayList<>();
  static final IdentityHashMap<Object, Integer> ids = new IdentityHashMap<>();
  static final ArrayList<Integer> seen = new ArrayList<>();
  static int pass = 1;
  static final Object VOID = new Object();
  /** The current call's arguments, as the code got them, and their types: what goes back after it (and after a callback). */
  static final ArrayList<Object> args = new ArrayList<>();
  static final ArrayList<Ty> argTypes = new ArrayList<>();

  @org.teavm.jso.JSBody(params = {"n"}, script = "return __kata.root(n);")
  static native org.teavm.jso.JSObject root(String n);
  @org.teavm.jso.JSBody(params = {"n", "v"}, script = "__kata.setRoot(n, v);")
  static native void setRoot(String n, org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"i"}, script = "return __kata.slot(i);")
  static native org.teavm.jso.JSObject slotJs(int i);
  /** 0 null or undefined, 1 string, 2 number, 3 boolean, 4 array, 5 Map, 6 Set, 7 object, 8 anything else. */
  @org.teavm.jso.JSBody(params = {"v"}, script = "return __kata.kind(v);")
  static native int kind(org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"v"}, script = "return String(v);")
  static native String str(org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"v"}, script = "return +v;")
  static native double num(org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"v"}, script = "return !!v;")
  static native boolean bool(org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"s"}, script = "return s;")
  static native org.teavm.jso.JSObject ofStr(String s);
  @org.teavm.jso.JSBody(params = {"d"}, script = "return d;")
  static native org.teavm.jso.JSObject ofNum(double d);
  @org.teavm.jso.JSBody(params = {"b"}, script = "return !!b;")
  static native org.teavm.jso.JSObject ofBool(boolean b);
  @org.teavm.jso.JSBody(script = "return undefined;")
  static native org.teavm.jso.JSObject undef();
  @org.teavm.jso.JSBody(params = {"v"}, script = "return __kata.idOf(v);")
  static native int idOf(org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"v"}, script = "return __kata.clsOf(v);")
  static native String clsOf(org.teavm.jso.JSObject v);
  /** The mirror for an id, made when it is new: kind 0 an item of class cls, 1 a plain object, 2 an array, 3 a Map, 4 a Set. */
  @org.teavm.jso.JSBody(params = {"id", "cls", "kind"}, script = "return __kata.mirror(id, cls, kind);")
  static native org.teavm.jso.JSObject mirror(int id, String cls, int kind);
  @org.teavm.jso.JSBody(params = {"v", "id"}, script = "__kata.adopt(v, id);")
  static native void adopt(org.teavm.jso.JSObject v, int id);
  @org.teavm.jso.JSBody(params = {"o", "k"}, script = "return __kata.has(o, k);")
  static native boolean has(org.teavm.jso.JSObject o, String k);
  @org.teavm.jso.JSBody(params = {"o", "k"}, script = "return o[k];")
  static native org.teavm.jso.JSObject get(org.teavm.jso.JSObject o, String k);
  @org.teavm.jso.JSBody(params = {"o", "k", "v"}, script = "__kata.put(o, k, v);")
  static native void put(org.teavm.jso.JSObject o, String k, org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"a"}, script = "return a.length;")
  static native int len(org.teavm.jso.JSObject a);
  @org.teavm.jso.JSBody(params = {"a", "i"}, script = "return a[i];")
  static native org.teavm.jso.JSObject at(org.teavm.jso.JSObject a, int i);
  /** Empties a mirror: an array, a Map or a Set of its elements, an object of its own properties. */
  @org.teavm.jso.JSBody(params = {"a"}, script = "__kata.empty(a);")
  static native void empty(org.teavm.jso.JSObject a);
  @org.teavm.jso.JSBody(params = {"a", "v"}, script = "a.push(v);")
  static native void push(org.teavm.jso.JSObject a, org.teavm.jso.JSObject v);
  /** Puts these values in an array mirror, unless it holds them already: an unchanged row isn't written to. */
  @org.teavm.jso.JSBody(params = {"a", "values"}, script = "__kata.fill(a, values);")
  static native void fill(org.teavm.jso.JSObject a, org.teavm.jso.JSObject values);
  @org.teavm.jso.JSBody(params = {"m", "k", "v"}, script = "m.set(k, v);")
  static native void mapSet(org.teavm.jso.JSObject m, org.teavm.jso.JSObject k, org.teavm.jso.JSObject v);
  @org.teavm.jso.JSBody(params = {"s", "v"}, script = "s.add(v);")
  static native void setAdd(org.teavm.jso.JSObject s, org.teavm.jso.JSObject v);
  /** A Map's entries as [key, value] pairs, a Set's values: an array either way. */
  @org.teavm.jso.JSBody(params = {"m"}, script = "return [...m];")
  static native org.teavm.jso.JSObject entries(org.teavm.jso.JSObject m);
  @org.teavm.jso.JSBody(script = "return [];")
  static native org.teavm.jso.JSObject newArray();
  @org.teavm.jso.JSBody(params = {"args"}, script = "__kata.vis(args);")
  static native void visJs(org.teavm.jso.JSObject args);
  @org.teavm.jso.JSBody(params = {"cls", "msg", "line"}, script = "__kata.thrown(cls, msg, line);")
  static native void thrownJs(String cls, String msg, int line);
  @org.teavm.jso.JSBody(params = {"v"}, script = "return __kata.show(v);")
  static native String showJs(org.teavm.jso.JSObject v);
  /** Calls a function of the check's; true when it threw, which the worker keeps to throw again once Java is out. */
  @org.teavm.jso.JSBody(params = {"f", "args"}, script = "return __kata.apply(f, args);")
  static native org.teavm.jso.JSObject applyJs(org.teavm.jso.JSObject f, org.teavm.jso.JSObject args);
  @org.teavm.jso.JSBody(script = "return __kata.threw();")
  static native boolean threw();

  /** An item as text, the way the console prints one: the item class's toString when it declares none. */
  static String show(Object o) {
    pass++;
    return showJs(out(o));
  }

  /** A type as written in a declaration: a name, its type arguments, and how many [] follow. */
  static final class Ty {
    final String name;
    final Ty[] args;
    final int dims;
    Ty(String name, Ty[] args, int dims) { this.name = name; this.args = args; this.dims = dims; }
    Ty arg(int i) { return i < args.length ? args[i] : OBJECT; }
    Ty element() { return dims > 0 ? new Ty(name, args, dims - 1) : arg(0); }
    boolean primitive() { return dims == 0 && PRIMITIVES.contains(name); }
    String text() {
      StringBuilder sb = new StringBuilder(name);
      if (args.length > 0) {
        sb.append('<');
        for (int i = 0; i < args.length; i++) sb.append(i > 0 ? "," : "").append(args[i].text());
        sb.append('>');
      }
      for (int i = 0; i < dims; i++) sb.append("[]");
      return sb.toString();
    }
  }
  static final List<String> PRIMITIVES = List.of("int", "long", "short", "byte", "double", "float", "char", "boolean");
  static final Ty OBJECT = new Ty("Object", new Ty[0], 0);
  static final Ty VOID_TY = new Ty("void", new Ty[0], 0);
  static final Ty INT = new Ty("int", new Ty[0], 0);
  static final Ty BOOL = new Ty("boolean", new Ty[0], 0);

  /** Unwinds the code when a function of the check's threw: the worker throws that error again. */
  static final class Abort extends RuntimeException {
    Abort() { super("kastet av sjekken"); }
  }

  /**
   * A function the check passed (a `swap(i, j)` that counts the moves). The code calls it through the interface its
   * parameter has: the call sends what the code has done to the check's objects so far, calls the function, and
   * reads back what the function did to them, so both sides see the same row.
   */
  static final class Fn {
    final org.teavm.jso.JSObject f;
    Fn(org.teavm.jso.JSObject f) { this.f = f; }

    Object call(Ty ret, Object... values) {
      pass++;
      for (Object a : args) out(a);
      org.teavm.jso.JSObject list = newArray();
      for (Object v : values) push(list, out(v));
      org.teavm.jso.JSObject r = applyJs(f, list);
      if (threw()) throw new Abort();
      pass++;
      for (int i = 0; i < args.size(); i++) {
        Object a = args.get(i);
        Integer id = a == null ? null : ids.get(a);
        if (id != null) in(mirror(id, "Object", 1), argTypes.get(i));
      }
      return in(r, ret);
    }
  }

  /** A function as the interface a parameter asks for: java.util.function's, Runnable and Comparator here, the code's own in KataGen. */
  static Object fn(Ty t, Fn f) {
    switch (t.name) {
      case "Runnable": return (Runnable) () -> f.call(VOID_TY);
      case "Supplier": return (Supplier<Object>) () -> f.call(t.arg(0));
      case "Consumer": return (Consumer<Object>) a -> f.call(VOID_TY, a);
      case "BiConsumer": return (BiConsumer<Object, Object>) (a, b) -> f.call(VOID_TY, a, b);
      case "Function": return (Function<Object, Object>) a -> f.call(t.arg(1), a);
      case "BiFunction": return (BiFunction<Object, Object, Object>) (a, b) -> f.call(t.arg(2), a, b);
      case "UnaryOperator": return (UnaryOperator<Object>) a -> f.call(t.arg(0), a);
      case "BinaryOperator": return (BinaryOperator<Object>) (a, b) -> f.call(t.arg(0), a, b);
      case "Predicate": return (Predicate<Object>) a -> (Boolean) f.call(BOOL, a);
      case "BiPredicate": return (BiPredicate<Object, Object>) (a, b) -> (Boolean) f.call(BOOL, a, b);
      case "Comparator": return (Comparator<Object>) (a, b) -> (Integer) f.call(INT, a, b);
      case "IntConsumer": return (IntConsumer) a -> f.call(VOID_TY, a);
      case "IntPredicate": return (IntPredicate) a -> (Boolean) f.call(BOOL, a);
      case "IntUnaryOperator": return (IntUnaryOperator) a -> (Integer) f.call(INT, a);
      case "IntBinaryOperator": return (IntBinaryOperator) (a, b) -> (Integer) f.call(INT, a, b);
      case "IntSupplier": return (IntSupplier) () -> (Integer) f.call(INT);
      case "IntFunction": return (IntFunction<Object>) a -> f.call(t.arg(0), a);
      case "ToIntFunction": return (ToIntFunction<Object>) a -> (Integer) f.call(INT, a);
      default: return Main.KataGen.fn(t.name, f);
    }
  }

  static Ty ty(String text) {
    int[] at = {0};
    return parseTy(text.replace(" ", ""), at);
  }

  static Ty parseTy(String s, int[] at) {
    if (s.startsWith("?extends", at[0])) at[0] += 8;
    else if (s.startsWith("?super", at[0])) at[0] += 6;
    else if (s.startsWith("?", at[0])) { at[0]++; return OBJECT; }
    int start = at[0];
    while (at[0] < s.length() && "<>,[]".indexOf(s.charAt(at[0])) < 0) at[0]++;
    String name = s.substring(start, at[0]);
    int dot = name.lastIndexOf('.');
    if (dot >= 0) name = name.substring(dot + 1);
    ArrayList<Ty> args = new ArrayList<>();
    if (at[0] < s.length() && s.charAt(at[0]) == '<') {
      at[0]++;
      while (at[0] < s.length() && s.charAt(at[0]) != '>') {
        args.add(parseTy(s, at));
        if (at[0] < s.length() && s.charAt(at[0]) == ',') at[0]++;
      }
      at[0]++;
    }
    int dims = 0;
    while (s.startsWith("[]", at[0])) { dims++; at[0] += 2; }
    if (s.startsWith("...", at[0])) { dims++; at[0] += 3; }
    return new Ty(name, args.toArray(new Ty[0]), dims);
  }

  // Ids: an object gets one the first time it crosses, and its mirror is the JavaScript object with that id.
  static int idFor(Object o) {
    Integer id = ids.get(o);
    if (id != null) return id;
    int n = objs.size();
    objs.add(o);
    seen.add(0);
    ids.put(o, n);
    return n;
  }

  static void bind(Object o, org.teavm.jso.JSObject js) {
    adopt(js, idFor(o));
  }

  /** True the first time an id is met in this pass, so a list in a ring is walked once. */
  static boolean visit(int id) {
    if (seen.get(id) == pass) return false;
    seen.set(id, pass);
    return true;
  }

  // Java to JavaScript.

  static org.teavm.jso.JSObject out(Object o) {
    if (o == null) return null;
    if (o == VOID) return undef();
    if (o instanceof String s) return ofStr(s);
    if (o instanceof Character c) return ofStr(String.valueOf(c));
    if (o instanceof Boolean b) return ofBool(b);
    if (o instanceof Number n) return ofNum(n.doubleValue());
    if (o instanceof Enum<?> e) return ofStr(e.name());
    String cls = Main.KataGen.cls(o);
    if (cls != null) {
      int id = idFor(o);
      org.teavm.jso.JSObject js = mirror(id, cls, Main.KataGen.isItem(cls) ? 0 : 1);
      // Field by field, and only what changed: what else the check has on its own object stays.
      if (visit(id)) Main.KataGen.out(o, js);
      return js;
    }
    if (o instanceof Map<?, ?> m) {
      int id = idFor(o);
      org.teavm.jso.JSObject js = mirror(id, "Map", 3);
      if (visit(id)) {
        empty(js);
        for (Map.Entry<?, ?> e : m.entrySet()) mapSet(js, out(e.getKey()), out(e.getValue()));
      }
      return js;
    }
    if (o instanceof Set<?> set) {
      int id = idFor(o);
      org.teavm.jso.JSObject js = mirror(id, "Set", 4);
      if (visit(id)) {
        empty(js);
        for (Object x : set) setAdd(js, out(x));
      }
      return js;
    }
    if (o instanceof Iterable<?> list) {
      int id = idFor(o);
      org.teavm.jso.JSObject js = mirror(id, "Array", 2);
      if (visit(id)) {
        org.teavm.jso.JSObject values = newArray();
        for (Object x : list) push(values, out(x));
        fill(js, values);
      }
      return js;
    }
    if (isArray(o)) {
      int id = idFor(o);
      org.teavm.jso.JSObject js = mirror(id, "Array", 2);
      if (visit(id)) {
        org.teavm.jso.JSObject values = newArray();
        int n = arrayLength(o);
        for (int i = 0; i < n; i++) push(values, out(arrayGet(o, i)));
        fill(js, values);
      }
      return js;
    }
    return ofStr(String.valueOf(o));
  }

  static boolean isArray(Object o) {
    return o instanceof Object[] || o instanceof int[] || o instanceof long[] || o instanceof double[]
        || o instanceof boolean[] || o instanceof char[] || o instanceof float[] || o instanceof short[] || o instanceof byte[];
  }

  static int arrayLength(Object o) {
    if (o instanceof Object[] a) return a.length;
    if (o instanceof int[] a) return a.length;
    if (o instanceof long[] a) return a.length;
    if (o instanceof double[] a) return a.length;
    if (o instanceof boolean[] a) return a.length;
    if (o instanceof char[] a) return a.length;
    if (o instanceof float[] a) return a.length;
    if (o instanceof short[] a) return a.length;
    if (o instanceof byte[] a) return a.length;
    return 0;
  }

  static Object arrayGet(Object o, int i) {
    if (o instanceof Object[] a) return a[i];
    if (o instanceof int[] a) return a[i];
    if (o instanceof long[] a) return a[i];
    if (o instanceof double[] a) return a[i];
    if (o instanceof boolean[] a) return a[i];
    if (o instanceof char[] a) return a[i];
    if (o instanceof float[] a) return a[i];
    if (o instanceof short[] a) return a[i];
    if (o instanceof byte[] a) return a[i];
    return null;
  }

  // JavaScript to Java, as the declared type asks.

  static Object in(org.teavm.jso.JSObject v, Ty t) {
    int k = kind(v);
    if (t.dims > 0) return k == 4 ? inArray(v, t) : null;
    switch (t.name) {
      case "int": case "Integer": return k == 2 ? (Object) (int) num(v) : t.primitive() ? (Object) 0 : null;
      case "long": case "Long": return k == 2 ? (Object) (long) num(v) : t.primitive() ? (Object) 0L : null;
      case "short": case "Short": return k == 2 ? (Object) (short) num(v) : t.primitive() ? (Object) (short) 0 : null;
      case "byte": case "Byte": return k == 2 ? (Object) (byte) num(v) : t.primitive() ? (Object) (byte) 0 : null;
      case "double": case "Double": return k == 2 ? (Object) num(v) : t.primitive() ? (Object) 0.0 : null;
      case "float": case "Float": return k == 2 ? (Object) (float) num(v) : t.primitive() ? (Object) 0f : null;
      case "boolean": case "Boolean": return k == 0 ? (t.primitive() ? (Object) false : null) : (Object) bool(v);
      case "char": case "Character": {
        if (k == 1) { String s = str(v); return s.isEmpty() ? (Object) '\0' : (Object) s.charAt(0); }
        if (k == 2) return (char) num(v);
        return t.primitive() ? (Object) '\0' : null;
      }
      case "String": case "CharSequence": return k == 0 ? null : str(v);
      case "List": case "ArrayList": case "Collection": case "Iterable": case "SequencedCollection":
      case "LinkedList": case "Deque": case "ArrayDeque": case "Queue": case "Stack": case "Vector":
        return k == 4 ? inList(v, t) : null;
      case "Map": case "HashMap": case "LinkedHashMap": case "TreeMap": case "SortedMap": case "NavigableMap":
        return k == 5 ? inMap(v, t) : null;
      case "Set": case "HashSet": case "LinkedHashSet": case "TreeSet": case "SortedSet": case "NavigableSet":
        return k == 6 || k == 4 ? inSet(v, t) : null;
      default:
        break;
    }
    if (k == 7) return inObject(v, t.name);
    if (k == 8) return fn(t, new Fn(v));
    return guess(v, k);
  }

  /** A value whose declared type says nothing (Object, a type variable): by what it is in JavaScript. */
  static Object guess(org.teavm.jso.JSObject v, int k) {
    switch (k) {
      case 1: return str(v);
      case 2: {
        double d = num(v);
        return d == Math.rint(d) && Math.abs(d) < 2147483648.0 ? (Object) (int) d : (Object) d;
      }
      case 3: return bool(v);
      case 4: return inList(v, OBJECT);
      case 5: return inMap(v, OBJECT);
      case 6: return inSet(v, OBJECT);
      case 7: return inObject(v, "Object");
      default: return null;
    }
  }

  static Object inObject(org.teavm.jso.JSObject v, String declared) {
    if (kind(v) != 7) return null;
    int id = idOf(v);
    Object o = id >= 0 ? objs.get(id) : null;
    if (o == null) {
      String cls = clsOf(v);
      o = Main.KataGen.make(cls);
      if (o == null) o = Main.KataGen.make(declared);
      if (o == null) return null;
      bind(o, v);
      id = idOf(v);
    }
    if (visit(id)) Main.KataGen.in(o, v);
    return o;
  }

  @SuppressWarnings("unchecked")
  static Object inList(org.teavm.jso.JSObject v, Ty t) {
    int id = idOf(v);
    Object old = id >= 0 ? objs.get(id) : null;
    Collection<Object> list;
    if (old instanceof Collection<?> c && fits(c, t.name)) list = (Collection<Object>) c;
    else {
      list = newList(t.name);
      if (id >= 0) { ids.remove(old); objs.set(id, list); ids.put(list, id); }
      else bind(list, v);
      id = idOf(v);
    }
    if (!visit(id)) return list;
    int n = len(v);
    ArrayList<Object> items = new ArrayList<>();
    for (int i = 0; i < n; i++) items.add(in(at(v, i), t.arg(0)));
    list.clear();
    list.addAll(items);
    return list;
  }

  static boolean fits(Collection<?> c, String name) {
    switch (name) {
      case "LinkedList": return c instanceof LinkedList;
      case "Deque": case "Queue": return c instanceof Deque;
      case "ArrayDeque": return c instanceof ArrayDeque;
      case "Stack": return c instanceof Stack;
      case "Vector": return c instanceof Vector;
      default: return c instanceof List;
    }
  }

  static Collection<Object> newList(String name) {
    switch (name) {
      case "LinkedList": return new LinkedList<>();
      case "Deque": case "ArrayDeque": case "Queue": return new ArrayDeque<>();
      case "Stack": return new Stack<>();
      case "Vector": return new Vector<>();
      default: return new ArrayList<>();
    }
  }

  static Object inMap(org.teavm.jso.JSObject v, Ty t) {
    Map<Object, Object> m = t.name.equals("TreeMap") || t.name.startsWith("Sorted") || t.name.startsWith("Navigable")
        ? new TreeMap<>() : new LinkedHashMap<>();
    org.teavm.jso.JSObject pairs = entries(v);
    int n = len(pairs);
    for (int i = 0; i < n; i++) {
      org.teavm.jso.JSObject pair = at(pairs, i);
      m.put(in(at(pair, 0), t.arg(0)), in(at(pair, 1), t.arg(1)));
    }
    return m;
  }

  static Object inSet(org.teavm.jso.JSObject v, Ty t) {
    Set<Object> s = t.name.equals("TreeSet") || t.name.startsWith("Sorted") || t.name.startsWith("Navigable")
        ? new TreeSet<>() : new LinkedHashSet<>();
    org.teavm.jso.JSObject values = kind(v) == 4 ? v : entries(v);
    int n = len(values);
    for (int i = 0; i < n; i++) s.add(in(at(values, i), t.arg(0)));
    return s;
  }

  static Object inArray(org.teavm.jso.JSObject v, Ty t) {
    int n = len(v);
    Ty e = t.element();
    int id = idOf(v);
    Object old = id >= 0 ? objs.get(id) : null;
    Object a = old != null && isArray(old) && arrayLength(old) == n ? old : newArray(e, n);
    if (a == null) return null;
    if (a != old) {
      if (id >= 0) { ids.remove(old); objs.set(id, a); ids.put(a, id); }
      else bind(a, v);
      id = idOf(v);
    }
    if (!visit(id)) return a;
    for (int i = 0; i < n; i++) {
      Object x = in(at(v, i), e);
      if (a instanceof Object[] arr) arr[i] = x;
      else if (a instanceof int[] arr) arr[i] = (Integer) x;
      else if (a instanceof long[] arr) arr[i] = (Long) x;
      else if (a instanceof double[] arr) arr[i] = (Double) x;
      else if (a instanceof boolean[] arr) arr[i] = (Boolean) x;
      else if (a instanceof char[] arr) arr[i] = (Character) x;
      else if (a instanceof float[] arr) arr[i] = (Float) x;
      else if (a instanceof short[] arr) arr[i] = (Short) x;
      else if (a instanceof byte[] arr) arr[i] = (Byte) x;
    }
    return a;
  }

  static Object newArray(Ty e, int n) {
    if (e.dims == 0) {
      switch (e.name) {
        case "int": return new int[n];
        case "long": return new long[n];
        case "double": return new double[n];
        case "boolean": return new boolean[n];
        case "char": return new char[n];
        case "float": return new float[n];
        case "short": return new short[n];
        case "byte": return new byte[n];
        case "String": return new String[n];
        case "Integer": return new Integer[n];
        case "Double": return new Double[n];
        case "Object": return new Object[n];
        default: break;
      }
    }
    if (e.dims == 1 && e.args.length == 0) {
      switch (e.name) {
        case "int": return new int[n][];
        case "long": return new long[n][];
        case "double": return new double[n][];
        case "boolean": return new boolean[n][];
        case "char": return new char[n][];
        case "String": return new String[n][];
        default: break;
      }
    }
    Object a = Main.KataGen.newArray(e.text(), n);
    return a != null ? a : new Object[n];
  }

  /** A check's argument i, as the parameter's type asks; kept, so what the call did to it goes back. */
  static Object arg(org.teavm.jso.JSObject a, int i, Ty t) {
    Object o = in(i < len(a) ? at(a, i) : null, t);
    args.add(o);
    argTypes.add(t);
    return o;
  }

  static Object slot(int i, String declared) {
    return inObject(slotJs(i), declared);
  }

  static Object root(String name, String type) {
    return in(root(name), ty(type));
  }

  /** Every object that has crossed, as it is now, the roots first: the page then sees the world as the code left it. */
  static void sync() {
    pass++;
    KataWorld.rootsOut();
    for (int i = 0; i < objs.size(); i++) out(objs.get(i));
  }

  /** How many objects the world started with (the items and what the roots hold): ids 0 … world - 1. */
  static int world = 0;

  /**
   * After a call from the check: the roots and the world's own objects, not every object the check has passed in
   * before (a check that calls the code thousands of times with new rows would pay for all of them every time).
   */
  static void syncWorld() {
    pass++;
    KataWorld.rootsOut();
    for (int i = 0; i < world && i < objs.size(); i++) out(objs.get(i));
  }

  @org.teavm.jso.JSBody(script = "return __kata.recording();")
  static native boolean recording();

  static void vis(Object[] marks) {
    // After the run (the check calling the code) the page keeps no more frames: don't build one.
    if (!recording()) return;
    sync();
    org.teavm.jso.JSObject list = newArray();
    for (Object m : marks) push(list, out(m));
    visJs(list);
  }

  /** An exception in the code: its class, its message and the line in the source it was thrown from. */
  static void thrown(Throwable e) {
    int line = -1;
    for (StackTraceElement f : e.getStackTrace()) {
      if ("Main.java".equals(f.getFileName()) && f.getLineNumber() > 0 && !f.getClassName().startsWith("Kata")) {
        line = f.getLineNumber();
        break;
      }
    }
    String name = e.getClass().getName();
    thrownJs(name.substring(name.lastIndexOf('.') + 1), e.getMessage(), line);
  }
}

/** Java 25's IO, which the runner's class library is too old to have. */
final class IO {
  static void println(Object o) { System.out.println(o); }
  static void println() { System.out.println(); }
  static void print(Object o) { System.out.print(o); }
}

final class KataMain {
  public static void main(String[] args) {}

  @org.teavm.jso.JSExport
  public static void run() {
    try {
      KataWorld.start();
      KataBridge.world = KataBridge.objs.size();
      KataBridge.code = new Main();
      Main.KataGen.main();
    } catch (Throwable e) {
      KataBridge.thrown(e);
    }
    KataBridge.sync();
  }

  /** The world as it is now; after a trap, which ends run() before it gets to send it. */
  @org.teavm.jso.JSExport
  public static void sync() {
    KataBridge.sync();
  }

  @org.teavm.jso.JSExport
  public static org.teavm.jso.JSObject call(String name, org.teavm.jso.JSObject args) {
    return after(() -> Main.KataGen.call(name, args));
  }

  @org.teavm.jso.JSExport
  public static org.teavm.jso.JSObject construct(String name, org.teavm.jso.JSObject args) {
    return after(() -> Main.KataGen.construct(name, args));
  }

  @org.teavm.jso.JSExport
  public static org.teavm.jso.JSObject invoke(org.teavm.jso.JSObject target, String name, org.teavm.jso.JSObject args) {
    return after(() -> {
      // An item the check made and never sent over is made in Java now, so its methods can run.
      Object self = KataBridge.inObject(target, KataBridge.clsOf(target));
      if (self != null) {
        KataBridge.args.add(self);
        KataBridge.argTypes.add(KataBridge.OBJECT);
      }
      return self == null ? KataBridge.VOID : Main.KataGen.invoke(self, name, args);
    });
  }

  @org.teavm.jso.JSExport
  public static org.teavm.jso.JSObject invokeStatic(String cls, String name, org.teavm.jso.JSObject args) {
    return after(() -> Main.KataGen.invokeStatic(cls, name, args));
  }

  interface Call { Object get(); }

  /** Runs a call from the check, then sends back what it returned and what it did to its arguments and the world. */
  static org.teavm.jso.JSObject after(Call call) {
    KataBridge.pass++;
    KataBridge.args.clear();
    KataBridge.argTypes.clear();
    Object result;
    try {
      result = call.get();
    } catch (KataBridge.Abort e) {
      return null;
    } catch (Throwable e) {
      KataBridge.thrown(e);
      return null;
    }
    KataBridge.syncWorld();
    for (Object a : new ArrayList<>(KataBridge.args)) KataBridge.out(a);
    return KataBridge.out(result);
  }
}
