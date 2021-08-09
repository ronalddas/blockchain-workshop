/* eslint-disable @typescript-eslint/camelcase */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-use-before-define */
import React, { useEffect, useState } from 'react';
import Web3 from 'web3';
import { ToastContainer, toast } from 'react-toastify';
import './app.scss';
import 'react-toastify/dist/ReactToastify.css';
import { PolyjuiceHttpProvider } from '@polyjuice-provider/web3';
import { AddressTranslator } from 'nervos-godwoken-integration';
import { CONFIG } from '../config';
// import { SimpleStorageWrapper } from '../lib/contracts/SimpleStorageWrapper';
import { TodoListWrapper } from '../lib/contracts/TodoListWrapper';
import * as ERC20JSON from '../../build/contracts/ERC20.json';

async function createWeb3() {
    // Modern dapp browsers...
    if ((window as any).ethereum) {
        // const web3 = new Web3((window as any).ethereum);
        const godwokenRpcUrl = CONFIG.WEB3_PROVIDER_URL;
        const providerConfig = {
            rollupTypeHash: CONFIG.ROLLUP_TYPE_HASH,
            ethAccountLockCodeHash: CONFIG.ETH_ACCOUNT_LOCK_CODE_HASH,
            web3Url: godwokenRpcUrl
        };
        const provider = new PolyjuiceHttpProvider(godwokenRpcUrl, providerConfig);
        const web3 = new Web3(provider || Web3.givenProvider);
        try {
            // Request account access if needed
            await (window as any).ethereum.enable();
        } catch (error) {
            // User denied account access...
        }

        return web3;
    }

    console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
    return null;
}

export function App() {
    const [web3, setWeb3] = useState<Web3>(null);
    const [contract, setContract] = useState<TodoListWrapper>();
    const [accounts, setAccounts] = useState<string[]>();
    const [balance, setBalance] = useState<bigint>();
    const [sudtBalance, setSudtBalance] = useState<bigint>();
    const [existingContractIdInputValue, setExistingContractIdInputValue] = useState<string>();
    const [taskDesc, setTaskDesc] = useState<string | undefined>();
    const [taskId, setTaskId] = useState<number | undefined>();
    const [taskList, setTaskList] = useState<any | undefined>();
    const [taskCount, setTaskCount] = useState<number | undefined>();
    const [transactionInProgress, setTransactionInProgress] = useState(false);
    const [polyjuiceAddress, setPolyjuiceAddress] = useState<string | undefined>();
    const [layer2DepositAddress, setLayer2DepositAddress] = useState<string | undefined>();
    const toastId = React.useRef(null);
    const [newStoredNumberInputValue, setNewStoredNumberInputValue] = useState<
        number | undefined
    >();
    useEffect(() => {
        if (accounts?.[0]) {
            const addressTranslator = new AddressTranslator();
            setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(accounts?.[0]));

        } else {
            setPolyjuiceAddress(undefined);
        }
    }, [accounts?.[0]]);
    useEffect(() => {
        if (transactionInProgress && !toastId.current) {
            toastId.current = toast.info(
                'Transaction in progress. Confirm MetaMask signing dialog and please wait...',
                {
                    position: 'top-right',
                    autoClose: false,
                    hideProgressBar: false,
                    closeOnClick: false,
                    pauseOnHover: true,
                    draggable: true,
                    progress: undefined,
                    closeButton: false
                }
            );
        } else if (!transactionInProgress && toastId.current) {
            toast.dismiss(toastId.current);
            toastId.current = null;
        }
    }, [transactionInProgress, toastId.current]);

    const account = accounts?.[0];
    const SimpleList = ({ list }) => (
        <ul>
            {list.map(item => (
                <li key={item.id}>
                    <label>Task ID</label><div>{item.id}</div>
                    <label>Task Title</label>
                    <div>{item.title}</div>
                    <label>Task Completed</label>
                    <div>{item.completed.toString()}</div>
                </li>
            ))}
        </ul>
    );
    async function deployContract() {
        const _contract = new TodoListWrapper(web3);

        try {
            setTransactionInProgress(true);

            await _contract.deploy(account);

            setExistingContractAddress(_contract.address);
            toast(
                'Successfully deployed a smart-contract. You can now proceed to get or set the value in a smart contract.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }

    async function getLayer2Address() {
        const addressTranslator = new AddressTranslator();
        const depositAddress = await addressTranslator.getLayer2DepositAddress(web3, accounts?.[0]);
        console.log(`Layer 2 Deposit Address on Layer 1: \n${depositAddress.addressString}`);
        setLayer2DepositAddress(depositAddress.addressString);
    }

    async function refreshBalance(){
        if(account){
            const _l2Balance = BigInt(await web3.eth.getBalance(account));
            setBalance(_l2Balance);
            console.log('refrehed balance')
        }
    }
    async function createTask(){
        try{
            setTransactionInProgress(true);
            await contract.createTask(taskDesc, account);
            toast(
                'Successfully added to task list. You can refresh the read value now manually.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }

    }
    async function renderTaskCount() {
        const task_count = await contract.getTaskCount(account);
        toast('Successfully read taskCount.', { type: 'success' });
        setTaskCount(task_count);
    }
    async function renderTask(){
        const task_list= await contract.getTaskList(taskCount,account)
        console.log(task_list)
        setTaskList(task_list);
    }
    async function toggleCompleted(){
        try{
            setTransactionInProgress(true);
            await contract.toggleTaskCompleted(taskId, account);
            console.log('Task Completed', taskId);
            toast(
                'Successfully toggled task to completed. You can refresh the read value now manually.',
                { type: 'success' }
            );
        } catch (error) {
            console.error(error);
            toast.error(
                'There was an error sending your transaction. Please check developer console.'
            );
        } finally {
            setTransactionInProgress(false);
        }
    }
    // async function getStoredValue() {
    //     const value = await contract.getStoredValue(account);
    //     toast('Successfully read latest stored value.', { type: 'success' });
    //
    //     setStoredValue(value);
    // }

    async function setExistingContractAddress(contractAddress: string) {
        const _contract = new TodoListWrapper(web3);
        _contract.useDeployed(contractAddress.trim());

        setContract(_contract);
        // setStoredValue(undefined);


    }

    // async function setNewStoredValue() {
    //     try {
    //         setTransactionInProgress(true);
    //         await contract.setStoredValue(newStoredNumberInputValue, account);
    //         toast(
    //             'Successfully set latest stored value. You can refresh the read value now manually.',
    //             { type: 'success' }
    //         );
    //     } catch (error) {
    //         console.error(error);
    //         toast.error(
    //             'There was an error sending your transaction. Please check developer console.'
    //         );
    //     } finally {
    //         setTransactionInProgress(false);
    //     }
    // }

    useEffect(() => {
        if (web3) {
            return;
        }

        (async () => {
            const _web3 = await createWeb3();
            setWeb3(_web3);

            const _accounts = [(window as any).ethereum.selectedAddress];
            setAccounts(_accounts);
            console.log({ _accounts });

            if (_accounts && _accounts[0]) {
                const _l2Balance = BigInt(await _web3.eth.getBalance(_accounts[0]));
                setBalance(_l2Balance);
                const addressTranslator = new AddressTranslator();
                // setPolyjuiceAddress(addressTranslator.ethAddressToGodwokenShortAddress(_accounts[0]));
                // console.log('polyjuiceAddress', polyjuiceAddress);
                const depositAddress = await addressTranslator.getLayer2DepositAddress(_web3, _accounts[0]);
                console.log(`Layer 2 Deposit Address on Layer 1: \n${depositAddress.addressString}`);
                setLayer2DepositAddress(depositAddress.addressString);
                // @ts-ignore
                // const contractProxy = new _web3.eth.Contract(ERC20JSON.abi,
                //     '0xF4a480351582C524D161AA76d401C67d42B72Eb2'
                // );
                const contractProxy = new _web3.eth.Contract(ERC20JSON.abi,
                    '0xeCDfEcaeBfF89d2a4925A732Aa09481cE5D6a026' // ckETH contract, SUDTID 30
                );

                const getSudtBalance = async () => {
                    console.log("call")
                    const _sudtBalance = await contractProxy.methods.balanceOf(addressTranslator.ethAddressToGodwokenShortAddress(_accounts[0])).call({
                        from: _accounts[0]
                    });
                    console.log('_sudtBalance', _sudtBalance);
                    setSudtBalance(_sudtBalance);

                    setTimeout(getSudtBalance, 30000);
                };

                getSudtBalance();
            }
        })();
    });

    const LoadingIndicator = () => <span className="rotating-icon">⚙️</span>;

    return (
        <div>
            Your ETH address: <b>{accounts?.[0]}</b>
            <br />
            <br />
            Your Polyjuice address: <b>{polyjuiceAddress}</b>
            <br />
            <button onClick={getLayer2Address} disabled={!balance}>
                Get Layer2 Address
            </button>
            <br />
            Your Layer2 deposit address: <b>{layer2DepositAddress}</b>
            <br />
            <br />
            To transfer ETH to layer2, please use the <a href="https://force-bridge-test.ckbapp.dev/bridge/Ethereum/Nervos?xchain-asset=0x0000000000000000000000000000000000000000" target="_blank">Force Bridge</a>, use the above layer 2 depositor address in the receiver field.
            <br />
            <br />
            <button onClick={refreshBalance} disabled={!balance}>
                Refresh Balance
            </button>
            <br />
            Balance: <b>{balance ? (balance / 10n ** 8n).toString() : <LoadingIndicator />} ETH</b>
            <br />
            <br />
            ckETH Balance: <b>{sudtBalance ? sudtBalance.toString() : <LoadingIndicator />} ckETH</b>
            <br />

            <br/>

            Deployed contract address: <b>{contract?.address || '-'}</b> <br />
            <br />
            <hr />
            <p>
                The button below will deploy a SimpleStorage smart contract where you can store a
                number value. By default the initial stored value is equal to 123 (you can change
                that in the Solidity smart contract). After the contract is deployed you can either
                read stored value from smart contract or set a new one. You can do that using the
                interface below.
            </p>
            <button onClick={deployContract} disabled={!balance}>
                Deploy contract
            </button>
            &nbsp;or&nbsp;
            <input
                placeholder="Existing contract id"
                onChange={e => setExistingContractIdInputValue(e.target.value)}
            />
            <button
                disabled={!existingContractIdInputValue || !balance}
                onClick={() => setExistingContractAddress(existingContractIdInputValue)}
            >
                Use existing contract
            </button>
            <br />
            <br />
            <button onClick={renderTaskCount} disabled={!contract}>
                Get Task Count
            </button>
            {taskCount ? <>&nbsp;&nbsp;Task Count: {taskCount.toString()}</> : null}
            <br />
            <br />
            <button onClick={renderTask} disabled={!contract}>
                Get Task List
            </button>
            {taskList ? <SimpleList list={taskList} /> : null}
            <br />
            <br />
            <input
                placeholder="Enter Task Id"
                type="number"
                onChange={e => setTaskId(parseInt(e.target.value,10))}
            />
            <button onClick={toggleCompleted} disabled={!contract}>
                Complete Task
            </button>
            <input
                placeholder="Enter Task Title"
                type="text"
                onChange={e => setTaskDesc(e.target.value)}
            />
            <button onClick={createTask} disabled={!contract}>
                Submit new task
            </button>

            <br />
            <br />
            <br />
            <br />
            <hr />
            <ToastContainer />
        </div>
    );
}
