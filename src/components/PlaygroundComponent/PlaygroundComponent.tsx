import { api, APIType, generateDerivApiInstance } from "appid";
import Title from "components/common/Title";
import RequestJSONBox from "components/RequestJSONBox";
import SelectRequestInput from "components/SelectRequestInput/SelectRequestInput";
import TokenInputField from "components/TokenInputField/TokenInputField";
import React, { useEffect, useRef, useState } from "react";
import data_get_api_token from "utils/data-app-registration";
import playground_requests from "utils/playground_requests";
import style from "./PlaygroundComponent.module.scss";

export type MessageType = {
    body: string | Error | {};
    type: string;
};

type StoredData = {
    request: string;
    selected_value: string;
    token: string;
};

export const PlaygroundComponent = () => {
    const [current_api, setCurrentAPI] = useState<APIType>(api);
    const [is_initial_socket, setIsInitialSocket] = useState<boolean>(true);
    const [messages, setMessages] = useState<Array<MessageType>>([]);
    const request_input = useRef<HTMLTextAreaElement>(null);
    const [text_data, setTextData] = useState<StoredData>({
        request: "",
        selected_value: "Select API Call - Version 3",
        token: "",
    });

    useEffect(() => {
        const sessionStorage_data = sessionStorage.getItem("session_data");
        const session_data_object = sessionStorage_data !== null ? JSON.parse(sessionStorage_data) : text_data;
        setTextData({ ...session_data_object });
        return () => {
            sessionStorage.clear();
        };
    }, []);

    const sendRequest = React.useCallback(() => {
        if (!request_input.current?.value && text_data.selected_value === "Select API Call - Version 3") {
            alert("Invalid JSON!");
            return;
        }
        const _request = request_input.current?.value && JSON.parse(request_input.current?.value);
        // We have to update api instance if websockets connection is closed as a result of reset:
        let relevant_api = current_api;
        if (current_api.connection.readyState !== 1 && is_initial_socket) {
            relevant_api = generateDerivApiInstance();
            setIsInitialSocket(false);
        } else if (current_api.connection.readyState !== 1 && !is_initial_socket) {
            relevant_api = generateDerivApiInstance();
            setIsInitialSocket(true);
        }
        _request &&
            relevant_api
                .send(_request)
                .then((res: string) =>
                    setMessages([...messages, { body: _request, type: "req" }, { body: res, type: "res" }])
                )
                .catch((err: Error) =>
                    setMessages([...messages, { body: _request, type: "req" }, { body: err, type: "err" }])
                );
        setCurrentAPI(relevant_api);
    }, [current_api, request_input, messages, is_initial_socket, text_data]);

    const handleAuthenticateClick = React.useCallback(
        (inserted_token: string) => {
            const database_authorize_request = playground_requests.find(el => el.name === "authorize");
            const _token =
                inserted_token ||
                ((database_authorize_request?.body && database_authorize_request?.body.authorize) as string);
            const request_body = {
                authorize: _token,
            };
            const new_text_data = {
                token: _token,
                selected_value: "Authorize",
                request: JSON.stringify(request_body, null, 2),
            };
            sessionStorage.setItem("session_data", JSON.stringify(new_text_data));
            Promise.resolve(setTextData({ ...new_text_data })).then(() => {
                sendRequest();
            });
        },
        [setTextData, sendRequest]
    );

    const handleSelectChange: React.ChangeEventHandler<HTMLSelectElement> = React.useCallback(
        e => {
            e.preventDefault();
            const request_body = playground_requests.find(el => el.name === e.currentTarget.value);
            const new_text_data = {
                ...text_data,
                selected_value: e.currentTarget.value,
                request: JSON.stringify(request_body?.body, null, 4),
            };
            setTextData({ ...new_text_data });
            sessionStorage.setItem(
                "session_data",
                JSON.stringify({ ...new_text_data, selected_value: request_body?.title })
            );
        },
        [text_data]
    );

    const handleTextAreaInput: React.ChangeEventHandler<HTMLTextAreaElement> = React.useCallback(
        e => setTextData({ ...text_data, request: e.target.value }),
        [text_data]
    );

    const json_box_props = {
        current_api,
        sendRequest,
        messages,
        setMessages,
        request_example: text_data.request,
        handleChange: handleTextAreaInput,
        request_input,
    };

    return (
        <div className={`${style["playground-page-wrapper"]} ${style.dark}`}>
            <div className={`${style["playground-api-json"]} ${style.dark}`}>
                <SelectRequestInput selected_value={text_data.selected_value} handleChange={handleSelectChange} />
                <div className={`${style["api-token"]} ${style.dark}`}>
                    <TokenInputField sendTokenToJSON={handleAuthenticateClick} />
                    <div className={style["vertical-separator"]}></div>
                    <div className={style["cta"]}>
                        <Title headerSize="h3" className={style["title"]}>
                            {data_get_api_token.textFocus}
                        </Title>
                        <div className={style["cta-button"]}>{data_get_api_token.button}</div>
                    </div>
                </div>
                <RequestJSONBox {...json_box_props} />
            </div>
            <div id="playground" className={style["playground-api-docs"]}>
                <div id="playground-req-schema"></div>
                <div id="playground-res-schema"></div>
            </div>
        </div>
    );
};