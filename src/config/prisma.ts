import { Types } from 'mongoose';
import {
  Address,
  AppSetting,
  AuditLog,
  Cart,
  CartItem,
  Category,
  CategoryAttribute,
  CategoryAttributeValue,
  CompanySettings,
  Coupon,
  CustomerTracker,
  FeatureFlag,
  HomeBanner,
  Notification,
  Otp,
  Order,
  OrderItem,
  PaymentLog,
  Product,
  ProductAttributeValue,
  Review,
  StaffProfile,
  TempUpdate,
  User,
  Wishlist,
  Attribute,
  AttributeValue,
  PasswordReset,
} from '../models/mongoose';

const MODEL_MAP: Record<string, any> = {
  user: User,
  address: Address,
  category: Category,
  product: Product,
  categoryAttribute: CategoryAttribute,
  categoryAttributeValue: CategoryAttributeValue,
  productAttributeValue: ProductAttributeValue,
  cart: Cart,
  cartItem: CartItem,
  order: Order,
  orderItem: OrderItem,
  wishlist: Wishlist,
  review: Review,
  notification: Notification,
  otp: Otp,
  tempUpdate: TempUpdate,
  coupon: Coupon,
  staffProfile: StaffProfile,
  auditLog: AuditLog,
  featureFlag: FeatureFlag,
  appSetting: AppSetting,
  paymentLog: PaymentLog,
  homeBanner: HomeBanner,
  customerTracker: CustomerTracker,
  attribute: Attribute,
  attributeValue: AttributeValue,
  companySettings: CompanySettings,
  passwordReset: PasswordReset,
};

const RELATION_MAP: Record<string, Record<string, { localField: string; foreignModel: string; foreignField: string; isArray?: boolean }>> = {
  cartItem: {
    cart: { localField: 'cartId', foreignModel: 'cart', foreignField: '_id' },
    product: { localField: 'productId', foreignModel: 'product', foreignField: '_id' },
  },
  orderItem: {
    order: { localField: 'orderId', foreignModel: 'order', foreignField: '_id' },
    product: { localField: 'productId', foreignModel: 'product', foreignField: '_id' },
  },
  order: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
    coupon: { localField: 'couponId', foreignModel: 'coupon', foreignField: '_id' },
    placedByAdmin: { localField: 'placedByAdminId', foreignModel: 'user', foreignField: '_id' },
    items: { localField: '_id', foreignModel: 'orderItem', foreignField: 'orderId', isArray: true },
  },
  cart: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
    items: { localField: '_id', foreignModel: 'cartItem', foreignField: 'cartId', isArray: true },
  },
  wishlist: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
    product: { localField: 'productId', foreignModel: 'product', foreignField: '_id' },
  },
  review: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
    product: { localField: 'productId', foreignModel: 'product', foreignField: '_id' },
  },
  paymentLog: {
    order: { localField: 'orderId', foreignModel: 'order', foreignField: '_id' },
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
  },
  address: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
  },
  staffProfile: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
    managedBy: { localField: 'managedBy', foreignModel: 'user', foreignField: '_id' },
  },
  product: {
    category: { localField: 'categoryId', foreignModel: 'category', foreignField: '_id' },
  },
  categoryAttribute: {
    category: { localField: 'categoryId', foreignModel: 'category', foreignField: '_id' },
  },
  categoryAttributeValue: {
    attribute: { localField: 'attributeId', foreignModel: 'categoryAttribute', foreignField: '_id' },
    value: { localField: 'attributeValueId', foreignModel: 'categoryAttributeValue', foreignField: '_id' },
  },
  productAttributeValue: {
    product: { localField: 'productId', foreignModel: 'product', foreignField: '_id' },
    attribute: { localField: 'attributeId', foreignModel: 'categoryAttribute', foreignField: '_id' },
    attributeValue: { localField: 'attributeValueId', foreignModel: 'categoryAttributeValue', foreignField: '_id' },
  },
  tempUpdate: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
  },
  auditLog: {
    user: { localField: 'userId', foreignModel: 'user', foreignField: '_id' },
  },
  notification: {
    triggeredBy: { localField: 'triggeredById', foreignModel: 'user', foreignField: '_id' },
    recipient: { localField: 'recipientId', foreignModel: 'user', foreignField: '_id' },
    order: { localField: 'orderId', foreignModel: 'order', foreignField: '_id' },
  },
};

const PRISMA_OPERATORS = new Set([
  'equals',
  'in',
  'notIn',
  'lt',
  'lte',
  'gt',
  'gte',
  'contains',
  'startsWith',
  'endsWith',
  'has',
  'hasEvery',
  'hasSome',
  'not',
]);

const OPERATOR_MAP: Record<string, string> = {
  in: '$in',
  notIn: '$nin',
  lt: '$lt',
  lte: '$lte',
  gt: '$gt',
  gte: '$gte',
  hasEvery: '$all',
  hasSome: '$in',
};

const isObject = (value: any): value is Record<string, any> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const convertFieldName = (field: string) => (field === 'id' ? '_id' : field);

const convertValue = (field: string, value: any) => {
  if (field === 'id' || field.endsWith('Id')) {
    if (Array.isArray(value)) {
      return value.map((v) => (Types.ObjectId.isValid(v) ? new Types.ObjectId(v) : v));
    }
    return Types.ObjectId.isValid(value) ? new Types.ObjectId(value) : value;
  }
  return value;
};

const isPrismaOperatorObject = (value: any) =>
  isObject(value) && Object.keys(value).every((key) => PRISMA_OPERATORS.has(key));

const convertPrismaOperator = (field: string, value: any): any => {
  if (!isObject(value)) {
    return convertValue(field, value);
  }

  const result: any = {};
  for (const [operator, operand] of Object.entries(value)) {
    if (operator === 'equals') {
      return convertValue(field, operand);
    }
    if (operator === 'not') {
      result.$not = convertPrismaOperator(field, operand);
      continue;
    }
    if (operator === 'contains') {
      result.$regex = new RegExp(operand, 'i');
      continue;
    }
    if (operator === 'startsWith') {
      result.$regex = new RegExp(`^${operand}`, 'i');
      continue;
    }
    if (operator === 'endsWith') {
      result.$regex = new RegExp(`${operand}$`, 'i');
      continue;
    }
    if (operator === 'has') {
      return operand;
    }
    const mongoOp = OPERATOR_MAP[operator];
    if (mongoOp) {
      result[mongoOp] = Array.isArray(operand)
        ? operand.map((v) => convertValue(field, v))
        : convertValue(field, operand);
      continue;
    }
    result[operator] = convertValue(field, operand);
  }
  return result;
};

const resolveRelationFilter = async (modelName: string, relationName: string, relationFilter: any) => {
  const relation = RELATION_MAP[modelName]?.[relationName];
  if (!relation) {
    return [];
  }

  const foreignModel = MODEL_MAP[relation.foreignModel];
  if (!foreignModel) {
    return [];
  }

  const query = await translateWhere(relationFilter, relation.foreignModel);
  const docs = await foreignModel.find(query, { _id: 1 }).exec();
  return docs.map((doc: any) => doc._id);
};

const translateWhere = async (where: any, modelName: string): Promise<any> => {
  if (!where || typeof where !== 'object') {
    return {};
  }

  const result: any = {};
  for (const [key, value] of Object.entries(where)) {
    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const clauses = Array.isArray(value) ? value : [value];
      const converted = await Promise.all(clauses.map((clause) => translateWhere(clause, modelName)));
      if (key === 'AND') result.$and = converted;
      if (key === 'OR') result.$or = converted;
      if (key === 'NOT') result.$nor = converted;
      continue;
    }

    const relation = RELATION_MAP[modelName]?.[key];
    const fieldName = convertFieldName(key);

    if (relation && isObject(value) && !isPrismaOperatorObject(value)) {
      const ids = await resolveRelationFilter(modelName, key, value);
      result[relation.localField] = ids.length > 0 ? { $in: ids } : { $in: [] };
      continue;
    }

    if (isPrismaOperatorObject(value)) {
      result[fieldName] = convertPrismaOperator(key, value);
      continue;
    }

    if (isObject(value)) {
      result[fieldName] = await translateWhere(value, modelName);
      continue;
    }

    result[fieldName] = convertValue(key, value);
  }

  return result;
};

const normalizeInclude = (modelName: string, args: any) => {
  const include: any = {};
  if (args?.include && typeof args.include === 'object') {
    Object.assign(include, args.include);
  }
  if (args?.select && typeof args.select === 'object') {
    for (const [key, value] of Object.entries(args.select)) {
      if (isObject(value) && RELATION_MAP[modelName]?.[key]) {
        include[key] = value;
      }
    }
  }
  return include;
};

const buildProjection = (modelName: string, select: any) => {
  if (!select || typeof select !== 'object') return '';
  const fields: string[] = [];
  for (const [key, value] of Object.entries(select)) {
    if (value === true && !RELATION_MAP[modelName]?.[key]) {
      fields.push(convertFieldName(key));
    }
  }
  return fields.join(' ');
};

const buildSort = (orderBy: any) => {
  if (!orderBy || typeof orderBy !== 'object') return {};
  const sort: any = {};
  for (const [key, value] of Object.entries(orderBy)) {
    if (key === '_sum' || key === '_count') {
      continue;
    }
    if (typeof value === 'string') {
      sort[convertFieldName(key)] = value.toLowerCase() === 'desc' ? -1 : 1;
    } else if (isObject(value)) {
      const nestedKey = Object.keys(value)[0];
      const nestedValue = value[nestedKey];
      sort[convertFieldName(nestedKey)] = nestedValue.toLowerCase() === 'desc' ? -1 : 1;
    }
  }
  return sort;
};

const attachRelations = async (modelName: string, docs: any[], include: any) => {
  if (!docs || docs.length === 0 || !include || typeof include !== 'object') {
    return;
  }

  const modelRelations = RELATION_MAP[modelName] ?? {};

  for (const [relationKey, relationInclude] of Object.entries(include)) {
    const relation = modelRelations[relationKey];
    if (!relation) continue;

    const nestedInclude = (relationInclude && typeof relationInclude === 'object')
      ? ((relationInclude as any).select || (relationInclude as any).include || relationInclude)
      : undefined;

    if (relation.isArray) {
      const ids = docs.map((doc) => doc._id).filter(Boolean);
      if (ids.length === 0) continue;
      const relatedDocs = await MODEL_MAP[relation.foreignModel]
        .find({ [relation.foreignField]: { $in: ids } })
        .exec();

      const grouped: Record<string, any[]> = {};
      relatedDocs.forEach((item: any) => {
        const foreignId = item[relation.foreignField]?.toString();
        if (!foreignId) return;
        grouped[foreignId] = grouped[foreignId] ?? [];
        grouped[foreignId].push(item);
      });

      for (const doc of docs) {
        const key = doc._id?.toString();
        doc[relationKey] = grouped[key] ?? [];
      }

      if (nestedInclude) {
        await attachRelations(relation.foreignModel, relatedDocs, nestedInclude);
      }
      continue;
    }

    const foreignIds = docs
      .map((doc) => doc[relation.localField])
      .filter(Boolean)
      .map((id) => id.toString());
    if (foreignIds.length === 0) continue;

    const relatedDocs = await MODEL_MAP[relation.foreignModel]
      .find({ _id: { $in: foreignIds } })
      .exec();

    const map: Record<string, any> = {};
    relatedDocs.forEach((item: any) => {
      map[item._id?.toString()] = item;
    });

    for (const doc of docs) {
      const id = doc[relation.localField]?.toString();
      doc[relationKey] = id ? map[id] ?? null : null;
    }

    if (nestedInclude) {
      await attachRelations(relation.foreignModel, relatedDocs, nestedInclude);
    }
  }
};

const queryModel = async (modelName: string, args: any = {}, options: { single?: boolean } = {}) => {
  const lowerName = modelName.toLowerCase();
  const model = MODEL_MAP[lowerName];
  if (!model) {
    throw new Error(`Unknown model: ${modelName}`);
  }

  const where = await translateWhere(args.where ?? {}, lowerName);
  const projection = buildProjection(lowerName, args.select);
  const include = normalizeInclude(lowerName, args);

  const query = options.single ? model.findOne(where) : model.find(where);
  if (projection) query.select(projection);
  if (args.orderBy) query.sort(buildSort(args.orderBy));
  if (!options.single && typeof args.skip === 'number') query.skip(args.skip);
  if (!options.single && typeof args.take === 'number') query.limit(args.take);

  const docs = await query.exec();
  const items = options.single ? (docs ? [docs] : []) : docs;
  await attachRelations(lowerName, items, include);

  return options.single ? docs : docs;
};

const buildUpdateData = (data: any) => {
  const update: any = {};
  const inc: any = {};

  for (const [key, value] of Object.entries(data ?? {})) {
    if (isObject(value) && ('increment' in value || 'decrement' in value)) {
      const change = value.increment ?? -value.decrement;
      if (typeof change === 'number') {
        inc[key] = change;
      }
      continue;
    }

    if (isObject(value) && 'set' in value && Object.keys(value).length === 1) {
      update[key] = value.set;
      continue;
    }

    update[key] = value;
  }

  const result: any = {};
  if (Object.keys(update).length > 0) result.$set = update;
  if (Object.keys(inc).length > 0) result.$inc = inc;
  return result;
};

const createDocument = async (modelName: string, data: any) => {
  const lowerName = modelName.toLowerCase();
  const model = MODEL_MAP[lowerName];
  if (!model) throw new Error(`Unknown model: ${modelName}`);

  if (lowerName === 'order' && data?.items?.create) {
    const itemsToCreate = data.items.create;
    const orderData = { ...data };
    delete orderData.items;

    const order = await model.create(orderData);
    const createDocs = Array.isArray(itemsToCreate) ? itemsToCreate : [itemsToCreate];
    await OrderItem.insertMany(
      createDocs.map((item: any) => ({ ...item, orderId: order._id })),
    );
    return order;
  }

  if (lowerName === 'cart' && data?.items?.create) {
    const itemsToCreate = data.items.create;
    const cartData = { ...data };
    delete cartData.items;

    const cart = await model.create(cartData);
    const createDocs = Array.isArray(itemsToCreate) ? itemsToCreate : [itemsToCreate];
    await CartItem.insertMany(
      createDocs.map((item: any) => ({ ...item, cartId: cart._id })),
    );
    return cart;
  }

  return model.create(data);
};

const buildAggregation = async (modelName: string, args: any) => {
  const lowerName = modelName.toLowerCase();
  const model = MODEL_MAP[lowerName];
  if (!model) throw new Error(`Unknown model: ${modelName}`);

  const where = await translateWhere(args.where ?? {}, lowerName);
  const pipeline: any[] = [{ $match: where }];
  const group: any = { _id: null };

  if (args._sum) {
    group._sum = {};
    for (const [field, enabled] of Object.entries(args._sum)) {
      if (enabled) group._sum[field] = { $sum: `$${field}` };
    }
  }
  if (args._count) {
    group._count = {};
    for (const [field, enabled] of Object.entries(args._count)) {
      if (enabled) group._count[field] = { $sum: 1 };
    }
  }

  if (Object.keys(group).length > 1) {
    pipeline.push({ $group: group });
  }

  const result = await model.aggregate(pipeline).exec();
  return result[0] ?? { _sum: {}, _count: {} };
};

const buildGroupBy = async (modelName: string, args: any) => {
  const lowerName = modelName.toLowerCase();
  const model = MODEL_MAP[lowerName];
  if (!model) throw new Error(`Unknown model: ${modelName}`);

  const where = await translateWhere(args.where ?? {}, lowerName);
  const groupFields = Array.isArray(args.by) ? args.by : [args.by];
  const groupId: any = groupFields.length === 1 ? `$${convertFieldName(groupFields[0])}` : {};
  if (Array.isArray(groupFields)) {
    groupFields.forEach((field) => {
      if (groupFields.length > 1) groupId[field] = `$${convertFieldName(field)}`;
    });
  }

  const groupStage: any = { _id: groupId };
  if (args._sum) {
    for (const [field, enabled] of Object.entries(args._sum)) {
      if (enabled) {
        groupStage._sum = groupStage._sum ?? {};
        groupStage._sum[field] = { $sum: `$${convertFieldName(field)}` };
      }
    }
  }
  if (args._count) {
    for (const [field, enabled] of Object.entries(args._count)) {
      if (enabled) {
        groupStage._count = groupStage._count ?? {};
        groupStage._count[field] = { $sum: 1 };
      }
    }
  }

  const pipeline: any[] = [{ $match: where }, { $group: groupStage }];

  if (args.orderBy) {
    const sort: any = {};
    for (const [key, value] of Object.entries(args.orderBy)) {
      if (key === '_sum' || key === '_count') {
        const sub = value as Record<string, string>;
        for (const [subKey, subValue] of Object.entries(sub)) {
          const path = `_${key}.${subKey}`;
          sort[path] = subValue.toLowerCase() === 'desc' ? -1 : 1;
        }
      }
    }
    if (Object.keys(sort).length > 0) pipeline.push({ $sort: sort });
  }

  if (typeof args.take === 'number') pipeline.push({ $limit: args.take });

  const rows = await model.aggregate(pipeline).exec();
  return rows.map((row: any) => {
    const mapped: any = {};
    if (groupFields.length === 1) {
      mapped[groupFields[0]] = row._id;
    } else {
      Object.assign(mapped, row._id);
    }
    if (row._sum) mapped._sum = row._sum;
    if (row._count) mapped._count = row._count;
    return mapped;
  });
};

class PrismaBridge {
  async findUnique(modelName: string, args: any) {
    return queryModel(modelName, args, { single: true });
  }

  async findFirst(modelName: string, args: any) {
    return queryModel(modelName, args, { single: true });
  }

  async findMany(modelName: string, args: any) {
    return queryModel(modelName, args, { single: false });
  }

  async count(modelName: string, args: any) {
    const lowerName = modelName.toLowerCase();
    const model = MODEL_MAP[lowerName];
    if (!model) throw new Error(`Unknown model: ${modelName}`);
    const where = await translateWhere(args?.where ?? {}, lowerName);
    return model.countDocuments(where).exec();
  }

  async create(modelName: string, args: any) {
    return createDocument(modelName, args.data);
  }

  async update(modelName: string, args: any) {
    const lowerName = modelName.toLowerCase();
    const model = MODEL_MAP[lowerName];
    if (!model) throw new Error(`Unknown model: ${modelName}`);

    const where = await translateWhere(args.where ?? {}, lowerName);
    const updateData = buildUpdateData(args.data);
    return model.findOneAndUpdate(where, updateData, { new: true }).exec();
  }

  async delete(modelName: string, args: any) {
    const lowerName = modelName.toLowerCase();
    const model = MODEL_MAP[lowerName];
    if (!model) throw new Error(`Unknown model: ${modelName}`);
    const where = await translateWhere(args.where ?? {}, lowerName);
    return model.findOneAndDelete(where).exec();
  }

  async deleteMany(modelName: string, args: any) {
    const lowerName = modelName.toLowerCase();
    const model = MODEL_MAP[lowerName];
    if (!model) throw new Error(`Unknown model: ${modelName}`);
    const where = await translateWhere(args.where ?? {}, lowerName);
    return model.deleteMany(where).exec();
  }

  async updateMany(modelName: string, args: any) {
    const lowerName = modelName.toLowerCase();
    const model = MODEL_MAP[lowerName];
    if (!model) throw new Error(`Unknown model: ${modelName}`);
    const where = await translateWhere(args.where ?? {}, lowerName);
    const updateData = buildUpdateData(args.data);
    return model.updateMany(where, updateData).exec();
  }

  async upsert(modelName: string, args: any) {
    const lowerName = modelName.toLowerCase();
    const model = MODEL_MAP[lowerName];
    if (!model) throw new Error(`Unknown model: ${modelName}`);
    const where = await translateWhere(args.where ?? {}, lowerName);
    const updateData = buildUpdateData(args.update);
    const options = { new: true, upsert: true, setDefaultsOnInsert: true };
    const result = await model.findOneAndUpdate(where, updateData, options).exec();
    return result;
  }

  async aggregate(modelName: string, args: any) {
    return buildAggregation(modelName, args);
  }

  async groupBy(modelName: string, args: any) {
    return buildGroupBy(modelName, args);
  }

  async $transaction(arg: any) {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    if (typeof arg === 'function') {
      return arg(globalThis.prisma);
    }
    throw new Error('$transaction expects an array or a callback function');
  }
}

const bridge = new Proxy(new PrismaBridge(), {
  get(target, property) {
    if (typeof property !== 'string') return undefined;
    if (property.startsWith('$')) {
      return (target as any)[property]?.bind(target);
    }
    return {
      findUnique: (args: any) => target.findUnique(property, args),
      findFirst: (args: any) => target.findFirst(property, args),
      findMany: (args: any) => target.findMany(property, args),
      count: (args: any) => target.count(property, args),
      create: (args: any) => target.create(property, args),
      update: (args: any) => target.update(property, args),
      delete: (args: any) => target.delete(property, args),
      deleteMany: (args: any) => target.deleteMany(property, args),
      updateMany: (args: any) => target.updateMany(property, args),
      upsert: (args: any) => target.upsert(property, args),
      aggregate: (args: any) => target.aggregate(property, args),
      groupBy: (args: any) => target.groupBy(property, args),
    };
  },
});

declare global {
  var prisma: any;
}

globalThis.prisma = bridge as any;

export { bridge as prisma };
