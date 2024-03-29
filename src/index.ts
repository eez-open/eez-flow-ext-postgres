import {
    IEezFlowEditor,
    IVariable,
    GenericDialogResult,
    IObjectVariableValueConstructorParams,
    IActionComponent,
    IDashboardComponentContext
} from "eez-studio-types";

import type { ClientConfig } from "pg";

export default {
    eezFlowExtensionInit: (eezFlowEditor: IEezFlowEditor) => {
        const {
            registerActionComponent,
            registerObjectVariableType,
            showGenericDialog,
            validators
        } = eezFlowEditor;

        ////////////////////////////////////////////////////////////////////////////////

        const POSTGRESS_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 38"><path fillOpacity=".702" d="M17 14c9.384 0 16.992-2.013 17-4.496V33.5c0 2.485-7.611 4.5-17 4.5v-7.842l.068.002 1.162 1.254c.373.389.757.728 1.151 1.016.394.288.806.515 1.236.681.43.166.901.249 1.413.249l1.078-.069.692-.136v-2.07l-.258.081-.292.063-.301.038-.274.013-.851-.065-.763-.234-.737-.46-.774-.743c1.085-.389 1.93-1.058 2.538-2.008.608-.96.912-2.107.912-3.44 0-1.707-.498-3.08-1.492-4.117-.99-1.049-2.285-1.573-3.883-1.573l-.625.025V14zm14-9.5h3v2c0 2.485-7.611 4.5-17 4.5V6c7.732 0 14-.672 14-1.5zM17.538 20.88c.86 0 1.532.32 2.017.957.483.629.725 1.503.725 2.623 0 1.08-.252 1.93-.758 2.547-.498.609-1.18.913-2.047.913L17 27.884v-6.959l.538-.045zM31.48 30v-2.08h-4.16V18.8h-2.56V30h6.72z"/><path d="M17 38c-9.389 0-17-2.015-17-4.5v-24C0 11.985 7.611 14 17 14v4.644c-1.44.115-2.612.652-3.52 1.61-1.027 1.086-1.54 2.513-1.54 4.28 0 .774.122 1.498.365 2.173a5.35 5.35 0 0 0 1.034 1.764c.446.501.983.9 1.611 1.195.615.29 1.299.447 2.05.473V38zM34 4.5h-3C31 3.672 24.732 3 17 3S3 3.672 3 4.5 9.268 6 17 6v5C7.611 11 0 8.985 0 6.5v-2C0 2.015 7.611 0 17 0c9.384 0 16.992 2.013 17 4.5zM3.14 29.532c.408.202.891.354 1.449.455a9.819 9.819 0 0 0 1.764.153c.601 0 1.173-.057 1.714-.171a4.235 4.235 0 0 0 1.425-.564c.409-.262.732-.603.97-1.025.239-.422.358-.943.358-1.565 0-.45-.067-.845-.2-1.184a2.77 2.77 0 0 0-.578-.905 4.249 4.249 0 0 0-.905-.711l-1.19-.595-.87-.391-.655-.39-.416-.418a.889.889 0 0 1-.146-.501.92.92 0 0 1 .131-.484l.37-.371.587-.24.77-.085.652.047.69.148.675.252.605.353v-2.298a6.186 6.186 0 0 0-1.246-.318l-1.552-.104c-.595 0-1.158.063-1.69.19-.531.127-1 .325-1.403.595a2.98 2.98 0 0 0-.958 1.03c-.234.417-.351.915-.351 1.495 0 .74.212 1.372.635 1.895.423.523 1.067.966 1.93 1.327l.946.413.759.42.505.474c.123.17.185.364.185.58l-.116.468a1.058 1.058 0 0 1-.354.374l-.591.249-.829.09a4.807 4.807 0 0 1-3.07-1.12v2.432zm12.292-7.7a2.479 2.479 0 0 1 1.568-.93v6.965a2.454 2.454 0 0 1-1.575-.91c-.51-.633-.765-1.487-.765-2.562 0-1.065.258-1.92.773-2.563z"/></svg>`;

        ////////////////////////////////////////////////////////////////////////////////

        registerActionComponent({
            name: "Postgres",

            icon: POSTGRESS_ICON,

            componentHeaderColor: "#FFCC66",

            bodyPropertyName: "sql",

            inputs: [],

            outputs: [],

            properties: [
                {
                    name: "connection",
                    type: "expression",
                    valueType: "object:PostgreSQLConnection"
                },
                {
                    name: "sql",
                    displayName: "SQL",
                    type: "template-literal"
                }
            ],

            defaults: {
                customOutputs: [
                    {
                        name: "result",
                        type: "any"
                    }
                ]
            },

            migrateProperties: (component: IActionComponent) => {
                if (
                    component.storeResultInto == undefined &&
                    component.customOutputs?.length == 0
                ) {
                    component.storeResultInto = "result";
                    component.customOutputs = [
                        {
                            name: "result",
                            type: "any"
                        }
                    ];
                }
            },

            execute: (context: IDashboardComponentContext) => {
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

                if (context.logInfo) {
                    context.logInfo(sql);
                }

                context = context.startAsyncExecution();

                (async () => {
                    const config: ClientConfig = {
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

                    const pg = await import("pg");
                    const client = new pg.default.Client(config);
                    try {
                        await client.connect();
                        const res = await client.query(sql);
                        await client.end();

                        context.propagateValue("result", res?.rows ?? []);
                        context.propagateValueThroughSeqout();
                    } catch (err) {
                        console.error(err);
                        context.throwError(err.toString());
                    } finally {
                        await client.end();
                    }

                    context.endAsyncExecution();
                })();
            }
        });

        ////////////////////////////////////////////////////////////////////////////////

        class PostgreSQLConnection {
            constructor(
                public constructorParams: PostgreSQLConnectionVariableTypeConstructorParams
            ) {}

            isConnected = false;
            error: string | undefined = undefined;

            get status() {
                return {
                    label: `Connected to ${this.constructorParams.host}`,
                    image: POSTGRESS_ICON,
                    color: this.error ? "red" : "green",
                    error: this.error
                };
            }

            async check() {
                let connection = Object.assign({}, this.constructorParams, {
                    connectionTimeoutMillis: 5000
                });

                if (connection.ssl) {
                    connection = Object.assign(connection, {
                        ssl: {
                            rejectUnauthorized: false
                        }
                    });
                }

                try {
                    const pg = await import("pg");
                    const client = new pg.Client(connection);
                    await client.connect();
                    await client.end();
                    this.isConnected = true;
                    this.error = undefined;
                } catch (err) {
                    this.isConnected = false;
                    this.error = err.toString();
                }
            }
        }

        ////////////////////////////////////////////////////////////////////////////////

        interface PostgreSQLConnectionVariableTypeConstructorParams {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
            ssl: boolean;
        }

        ////////////////////////////////////////////////////////////////////////////////

        async function showConnectDialog(
            variable: IVariable,
            values: IObjectVariableValueConstructorParams | undefined
        ) {
            try {
                const result = await showGenericDialog({
                    dialogDefinition: {
                        title: variable.description || variable.name,
                        size: "medium",
                        fields: [
                            {
                                name: "host",
                                type: "string",
                                validators: [validators.required]
                            },
                            {
                                name: "port",
                                type: "integer",
                                validators: [
                                    validators.rangeInclusive(0, 65535)
                                ]
                            },
                            {
                                name: "user",
                                type: "string",
                                validators: [validators.required]
                            },
                            {
                                name: "password",
                                type: "password",
                                validators: [validators.required]
                            },
                            {
                                name: "database",
                                type: "string",
                                validators: [validators.required]
                            },
                            {
                                name: "ssl",
                                type: "boolean"
                            }
                        ],
                        error: undefined
                    },
                    values: values || {},
                    okButtonText: "Connect",
                    onOk: async (result: GenericDialogResult) => {
                        const postgreSQLConnection = new PostgreSQLConnection(
                            result.values
                        );
                        postgreSQLConnection.check();
                        return new Promise<boolean>(resolve => {
                            const interval = setInterval(() => {
                                if (postgreSQLConnection.isConnected) {
                                    resolve(true);
                                    clearInterval(interval);
                                } else if (postgreSQLConnection.error) {
                                    result.onProgress(
                                        "error",
                                        postgreSQLConnection.error
                                    );
                                    resolve(false);
                                    clearInterval(interval);
                                } else {
                                    if (
                                        !result.onProgress(
                                            "info",
                                            "Connecting..."
                                        )
                                    ) {
                                        resolve(false);
                                        clearInterval(interval);
                                    }
                                }
                            }, 10);
                        });
                    }
                });

                return result.values;
            } catch (err) {
                return undefined;
            }
        }

        ////////////////////////////////////////////////////////////////////////////////

        registerObjectVariableType("PostgreSQLConnection", {
            editConstructorParams: async (
                variable: IVariable,
                constructorParams?: IObjectVariableValueConstructorParams
            ): Promise<IObjectVariableValueConstructorParams | undefined> => {
                return await showConnectDialog(variable, constructorParams);
            },

            createValue: (
                constructorParams: PostgreSQLConnectionVariableTypeConstructorParams
            ) => {
                return new PostgreSQLConnection(constructorParams);
            },

            destroyValue: () => {},

            valueFieldDescriptions: [
                {
                    name: "host",
                    valueType: "string",
                    getFieldValue: (value: PostgreSQLConnection) =>
                        value.constructorParams.host
                },
                {
                    name: "port",
                    valueType: "integer",
                    getFieldValue: (value: PostgreSQLConnection) =>
                        value.constructorParams.port
                },
                {
                    name: "user",
                    valueType: "string",
                    getFieldValue: (value: PostgreSQLConnection) =>
                        value.constructorParams.user
                },
                {
                    name: "password",
                    valueType: "string",
                    getFieldValue: (value: PostgreSQLConnection) =>
                        value.constructorParams.password
                },
                {
                    name: "database",
                    valueType: "string",
                    getFieldValue: (value: PostgreSQLConnection) =>
                        value.constructorParams.database
                },
                {
                    name: "ssl",
                    valueType: "boolean",
                    getFieldValue: (value: PostgreSQLConnection) =>
                        value.constructorParams.ssl
                }
            ]
        });
    }
};
