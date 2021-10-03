import {
    IEezStudio,
    IFlowContext,
    IFlowState,
    PropertyType,
    IDataContext,
    IVariable,
    GenericDialogResult
} from "eez-studio-types";
import pg from "pg";

const extension = {
    eezFlowExtensionInit: (eezStudio: IEezStudio) => {
        const {
            React,
            mobx,
            registerClass,
            makeDerivedClassInfo,
            ActionComponent,
            VariableType,
            getFlow,
            showGenericDialog,
            validators,
            propertyGridGroups: { specificGroup },
            RenderVariableStatus,
            evalExpression
        } = eezStudio;

        const POSTGRESQL_ICON = (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 38">
                <path
                    fillOpacity=".702"
                    d="M17 14c9.384 0 16.992-2.013 17-4.496V33.5c0 2.485-7.611 4.5-17 4.5v-7.842l.068.002 1.162 1.254c.373.389.757.728 1.151 1.016.394.288.806.515 1.236.681.43.166.901.249 1.413.249l1.078-.069.692-.136v-2.07l-.258.081-.292.063-.301.038-.274.013-.851-.065-.763-.234-.737-.46-.774-.743c1.085-.389 1.93-1.058 2.538-2.008.608-.96.912-2.107.912-3.44 0-1.707-.498-3.08-1.492-4.117-.99-1.049-2.285-1.573-3.883-1.573l-.625.025V14zm14-9.5h3v2c0 2.485-7.611 4.5-17 4.5V6c7.732 0 14-.672 14-1.5zM17.538 20.88c.86 0 1.532.32 2.017.957.483.629.725 1.503.725 2.623 0 1.08-.252 1.93-.758 2.547-.498.609-1.18.913-2.047.913L17 27.884v-6.959l.538-.045zM31.48 30v-2.08h-4.16V18.8h-2.56V30h6.72z"
                />
                <path d="M17 38c-9.389 0-17-2.015-17-4.5v-24C0 11.985 7.611 14 17 14v4.644c-1.44.115-2.612.652-3.52 1.61-1.027 1.086-1.54 2.513-1.54 4.28 0 .774.122 1.498.365 2.173a5.35 5.35 0 0 0 1.034 1.764c.446.501.983.9 1.611 1.195.615.29 1.299.447 2.05.473V38zM34 4.5h-3C31 3.672 24.732 3 17 3S3 3.672 3 4.5 9.268 6 17 6v5C7.611 11 0 8.985 0 6.5v-2C0 2.015 7.611 0 17 0c9.384 0 16.992 2.013 17 4.5zM3.14 29.532c.408.202.891.354 1.449.455a9.819 9.819 0 0 0 1.764.153c.601 0 1.173-.057 1.714-.171a4.235 4.235 0 0 0 1.425-.564c.409-.262.732-.603.97-1.025.239-.422.358-.943.358-1.565 0-.45-.067-.845-.2-1.184a2.77 2.77 0 0 0-.578-.905 4.249 4.249 0 0 0-.905-.711l-1.19-.595-.87-.391-.655-.39-.416-.418a.889.889 0 0 1-.146-.501.92.92 0 0 1 .131-.484l.37-.371.587-.24.77-.085.652.047.69.148.675.252.605.353v-2.298a6.186 6.186 0 0 0-1.246-.318l-1.552-.104c-.595 0-1.158.063-1.69.19-.531.127-1 .325-1.403.595a2.98 2.98 0 0 0-.958 1.03c-.234.417-.351.915-.351 1.495 0 .74.212 1.372.635 1.895.423.523 1.067.966 1.93 1.327l.946.413.759.42.505.474c.123.17.185.364.185.58l-.116.468a1.058 1.058 0 0 1-.354.374l-.591.249-.829.09a4.807 4.807 0 0 1-3.07-1.12v2.432zm12.292-7.7a2.479 2.479 0 0 1 1.568-.93v6.965a2.454 2.454 0 0 1-1.575-.91c-.51-.633-.765-1.487-.765-2.562 0-1.065.258-1.92.773-2.563z" />
            </svg>
        );

        ////////////////////////////////////////////////////////////////////////////////

        class PostgresActionComponent extends ActionComponent {
            static classInfo = makeDerivedClassInfo(ActionComponent.classInfo, {
                properties: [
                    {
                        name: "connection",
                        type: PropertyType.String,
                        propertyGridGroup: specificGroup
                    },
                    {
                        name: "sql",
                        displayName: "SQL",
                        type: PropertyType.MultilineText,
                        propertyGridGroup: specificGroup
                    }
                ],
                icon: POSTGRESQL_ICON,
                componentHeaderColor: "#FFCC66",
                updateObjectValueHook: (
                    object: PostgresActionComponent,
                    values: any
                ) => {
                    if (values.sql) {
                        const { inputs: inputsBefore, outputs: outputsBefore } =
                            PostgresActionComponent.parse(object.sql);

                        const { inputs: inputsAfter, outputs: outputsAfter } =
                            PostgresActionComponent.parse(values.sql);

                        const flow = getFlow(object);

                        inputsBefore.forEach((inputBefore, i) => {
                            if (inputsAfter.indexOf(inputBefore) === -1) {
                                if (
                                    inputsBefore.length === inputsAfter.length
                                ) {
                                    flow.rerouteConnectionLinesInput(
                                        object,
                                        inputBefore,
                                        inputsAfter[i]
                                    );
                                } else {
                                    flow.deleteConnectionLinesToInput(
                                        object,
                                        inputBefore
                                    );
                                }
                            }
                        });

                        outputsBefore.forEach((outputBefore, i) => {
                            if (outputsAfter.indexOf(outputBefore) === -1) {
                                if (
                                    outputsBefore.length === outputsAfter.length
                                ) {
                                    flow.rerouteConnectionLinesOutput(
                                        object,
                                        outputBefore,
                                        outputsAfter[i]
                                    );
                                } else {
                                    flow.deleteConnectionLinesFromOutput(
                                        object,
                                        outputBefore
                                    );
                                }
                            }
                        });
                    }
                }
            });

            @mobx.observable connection: string;
            @mobx.observable sql: string;

            static readonly PARAMS_REGEXP = /\{([^\}]+)\}/;

            static parse(sql: string) {
                const inputs = new Set<string>();
                const outputs = new Set<string>();

                if (sql) {
                    PostgresActionComponent.PARAMS_REGEXP.lastIndex = 0;
                    let str = sql;
                    while (true) {
                        let matches = str.match(
                            PostgresActionComponent.PARAMS_REGEXP
                        );
                        if (!matches) {
                            break;
                        }
                        const input = matches[1].trim();
                        inputs.add(input);
                        str = str.substring(matches.index! + matches[1].length);
                    }
                }

                return {
                    inputs: Array.from(inputs.keys()),
                    outputs: Array.from(outputs.keys())
                };
            }

            getInputs() {
                return [
                    ...super.getInputs(),
                    ...PostgresActionComponent.parse(this.sql).inputs.map(
                        input => ({
                            name: input,
                            displayName: input,
                            type: PropertyType.Any
                        })
                    )
                ];
            }

            getOutputs() {
                return [
                    ...super.getOutputs(),
                    {
                        name: "result",
                        type: PropertyType.Any
                    }
                ];
            }

            expandSqlParams(runningFlow: IFlowState) {
                let sql = this.sql;

                PostgresActionComponent.parse(sql).inputs.forEach(input => {
                    const inputPropertyValue =
                        runningFlow.getInputPropertyValue(this, input);
                    if (
                        inputPropertyValue &&
                        inputPropertyValue.value != undefined
                    ) {
                        sql = sql.replace(
                            new RegExp(`\{${input}\}`, "g"),
                            inputPropertyValue.value
                        );
                    } else {
                        throw `missing postgres parameter ${input}`;
                    }
                });

                return sql;
            }

            async execute(flowState: IFlowState) {
                const postgreSQLConnection = evalExpression(
                    flowState,
                    this,
                    this.connection
                ) as PostgreSQLConnection | null;
                if (!postgreSQLConnection) {
                    throw `connection "${this.connection}" not found`;
                }

                if (!(postgreSQLConnection instanceof PostgreSQLConnection)) {
                    throw `"${this.connection}" is not PostgreSQLConnection`;
                }

                let connection = postgreSQLConnection;
                if (connection.ssl) {
                    connection = Object.assign(connection, {
                        ssl: {
                            rejectUnauthorized: false
                        }
                    });
                }

                const client = new pg.Client(connection);
                try {
                    await client.connect();
                    mobx.runInAction(() => {
                        postgreSQLConnection._status = true;
                        postgreSQLConnection._error = undefined;
                    });
                } catch (err) {
                    mobx.runInAction(() => {
                        postgreSQLConnection._status = false;
                        postgreSQLConnection._error = err.toString();
                    });
                    throw err;
                }

                const sql = this.expandSqlParams(flowState);

                flowState.log("debug", `PostgreSQL: ${sql}`, this);

                const res = await client.query(sql);

                flowState.log("debug", `PostgreSQL result: ${res}`, this);

                await client.end();

                flowState.propagateValue(this, "result", res);

                return undefined;
            }

            getBody(flowContext: IFlowContext): React.ReactNode {
                return (
                    <div className="body">
                        <pre>{this.sql}</pre>
                    </div>
                );
            }
        }

        registerClass(PostgresActionComponent);

        ////////////////////////////////////////////////////////////////////////////////

        class PostgreSQLConnection {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
            ssl: boolean;

            @mobx.observable
            _status: boolean = false;

            @mobx.observable
            _error: string | undefined = undefined;

            get isConnected() {
                return this._status;
            }

            async check() {
                let connection = Object.assign(this, {
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
                    const client = new pg.Client(connection);
                    await client.connect();
                    await client.end();
                    mobx.runInAction(() => {
                        this._status = true;
                        this._error = undefined;
                    });
                } catch (err) {
                    mobx.runInAction(() => {
                        this._status = false;
                        this._error = err.toString();
                    });
                }
            }
        }

        async function showConnectDialog(variable: IVariable, values: any) {
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
                    values,
                    okButtonText: "Connect",
                    onOk: async (result: GenericDialogResult) => {
                        const postgreSQLConnection = new PostgreSQLConnection();
                        Object.assign(postgreSQLConnection, result.values);
                        postgreSQLConnection.check();
                        return new Promise<boolean>(resolve => {
                            const interval = setInterval(() => {
                                if (postgreSQLConnection.isConnected) {
                                    resolve(true);
                                    clearInterval(interval);
                                } else if (postgreSQLConnection._error) {
                                    result.onPogress(
                                        "error",
                                        postgreSQLConnection._error
                                    );
                                    resolve(false);
                                    clearInterval(interval);
                                } else {
                                    if (
                                        !result.onPogress(
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

                const postgreSQLConnection = new PostgreSQLConnection();
                Object.assign(postgreSQLConnection, result.values);
                return postgreSQLConnection;
            } catch (err) {
                return null;
            }
        }

        class PostgreSQLConnectionVariableType extends VariableType {
            static classInfo = makeDerivedClassInfo(VariableType.classInfo, {
                properties: [],
                onVariableConstructor: async (variable: IVariable) => {
                    return await showConnectDialog(variable, {});
                },
                onVariableLoad: async (value: any) => {
                    if (value) {
                        const postgreSQLConnection = new PostgreSQLConnection();
                        Object.assign(postgreSQLConnection, value);
                        postgreSQLConnection.check();
                        return postgreSQLConnection;
                    }
                    return null;
                },
                onVariableSave: async (value: PostgreSQLConnection | null) => {
                    return value
                        ? {
                              host: value.host,
                              port: value.port,
                              user: value.user,
                              password: value.password,
                              database: value.database,
                              ssl: value.ssl
                          }
                        : null;
                },
                renderVariableStatus: (
                    variable: IVariable,
                    dataContext: IDataContext
                ) => {
                    const postgreSQLConnection = dataContext.get(
                        variable.name
                    ) as PostgreSQLConnection | null;
                    return (
                        <RenderVariableStatus
                            key={variable.name}
                            variable={variable}
                            image={POSTGRESQL_ICON}
                            color={
                                postgreSQLConnection &&
                                postgreSQLConnection.isConnected
                                    ? "green"
                                    : "red"
                            }
                            error={
                                postgreSQLConnection
                                    ? !!postgreSQLConnection._error
                                    : false
                            }
                            title={
                                postgreSQLConnection
                                    ? postgreSQLConnection._error
                                    : undefined
                            }
                            onClick={async () => {
                                const postgreSQLConnection =
                                    await showConnectDialog(
                                        variable,
                                        dataContext.get(variable.name) || {}
                                    );
                                if (postgreSQLConnection) {
                                    dataContext.set(
                                        variable.name,
                                        postgreSQLConnection
                                    );
                                }
                            }}
                        />
                    );
                }
            });
        }

        registerClass(PostgreSQLConnectionVariableType);
    }
};

export default extension;
