import { IEezFlowRuntime, IDashboardComponentContext } from "eez-studio-types";

import pg from "pg";

export default {
    eezFlowExtensionInit: (eezFlowRuntime: IEezFlowRuntime) => {
        const { registerExecuteFunction } = eezFlowRuntime;

        registerExecuteFunction(
            "Postgres",
            function (context: IDashboardComponentContext) {
                interface PostgreSQLConnectionVariableTypeConstructorParams {
                    host: string;
                    port: number;
                    user: string;
                    password: string;
                    database: string;
                    ssl: boolean;
                }

                const connection =
                    context.evalProperty<PostgreSQLConnectionVariableTypeConstructorParams>(
                        "connection"
                    );

                if (!connection) {
                    context.throwError(`Invalid PostgreSQL connection`);
                    return;
                }

                const sql = context.evalProperty<string>("sql");
                if (!sql) {
                    context.throwError(`Invalid SQL`);
                    return;
                }

                context = context.startAsyncExecution();

                (async () => {
                    const config: pg.ClientConfig = {
                        host: connection.host,
                        port: connection.port,
                        user: connection.user,
                        password: connection.password,
                        database: connection.database
                    };

                    if (connection.ssl) {
                        config.ssl = {
                            rejectUnauthorized: false
                        };
                    }

                    try {
                        const client = new pg.Client(config);
                        await client.connect();
                        const res = await client.query(sql);
                        await client.end();

                        context.propagateValue("result", res?.rows ?? []);
                        context.propagateValueThroughSeqout();
                    } catch (err) {
                        console.error(err);
                        context.throwError(err.toString());
                    }

                    context.endAsyncExecution();
                })();
            }
        );
    }
};
