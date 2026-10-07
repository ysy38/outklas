import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";

export type Query = <T>(sql: string, params?: unknown[]) => Promise<T[]>;

export type TableShape = {
  columns: { name: string; type: string; nullable: string; has_default: boolean }[];
  indexes: string[];
  primary: string[];
  foreign: string[];
};

const infoSchemaType = (sqlType: string) => (sqlType.endsWith("[]") ? "ARRAY" : sqlType.replace(/\(.*\)$/, ""));

/** What the Drizzle definition says the table looks like, in information_schema terms. */
export function expectedShape(table: PgTable): TableShape {
  const config = getTableConfig(table);
  return {
    columns: config.columns
      .map((column) => ({ name: column.name, type: infoSchemaType(column.getSQLType()), nullable: column.notNull ? "NO" : "YES", has_default: column.hasDefault }))
      .sort((a, b) => (a.name < b.name ? -1 : 1)),
    indexes: [...config.indexes.map((index) => index.config.name!), ...config.uniqueConstraints.map((constraint) => constraint.getName()!)].sort(),
    primary: [...config.columns.filter((column) => column.primary), ...(config.primaryKeys[0]?.columns ?? [])].map((column) => column.name).sort(),
    foreign: config.foreignKeys
      .map((key) => {
        const reference = key.reference();
        return `${reference.columns[0].name}->${getTableConfig(reference.foreignTable).name}.${reference.foreignColumns[0].name}`;
      })
      .sort(),
  };
}

/** What the migrated database actually has. */
export async function actualShape(query: Query, table: PgTable): Promise<TableShape> {
  const config = getTableConfig(table);
  const schema = config.schema ?? "public";
  const qualified = `${schema}.${config.name}`;
  const columns = await query<TableShape["columns"][number]>(
    `select column_name as name, data_type as type, is_nullable as nullable, column_default is not null as has_default
     from information_schema.columns where table_schema = $1 and table_name = $2 order by column_name`,
    [schema, config.name],
  );
  const indexes = await query<{ name: string }>(
    "select indexname as name from pg_indexes where schemaname = $1 and tablename = $2 and indexname not like '%_pkey' order by indexname",
    [schema, config.name],
  );
  const primary = await query<{ name: string }>(
    `select a.attname as name from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
     where i.indrelid = $1::regclass and i.indisprimary order by a.attname`,
    [qualified],
  );
  const foreign = await query<{ link: string }>(
    `select a.attname || '->' || f.relname || '.' || af.attname as link
     from pg_constraint c
     join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
     join pg_class f on f.oid = c.confrelid
     join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
     where c.contype = 'f' and c.conrelid = $1::regclass order by link`,
    [qualified],
  );
  return {
    columns,
    indexes: indexes.map((index) => index.name),
    primary: primary.map((column) => column.name),
    foreign: foreign.map((key) => key.link),
  };
}
