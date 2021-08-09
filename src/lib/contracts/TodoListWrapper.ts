import Web3 from 'web3';
import * as TodoListJSON from '../../../build/contracts/TodoList.json';
import { TodoList } from '../../types/TodoList';

const DEFAULT_SEND_OPTIONS = {
    gas: 6000000
};
export class TodoListWrapper {
    web3: Web3;

    contract: TodoList;

    address: string;

    constructor(web3: Web3) {
        this.web3 = web3;
        this.contract = new web3.eth.Contract(TodoListJSON.abi as any) as any;
    }

    get isDeployed() {
        return Boolean(this.address);
    }

    async getTaskList(taskCount: number, fromAddress: string) {
        const taskList=[]
        for (let i = 1; i <= taskCount; i++) {
            const task = await this.contract.methods.tasks(i).call({
                gas: 6000000,
                from: fromAddress,
            });
            // const taskId = task[0].toNumber();
            const taskId = parseInt(task[0], 10);
            const taskTitle = task[1];
            const taskCompleted = task[2];
            taskList.push({ id: taskId, title: taskTitle, completed: taskCompleted });
        }
        return taskList;
    }

    async getTaskCount(fromAddress: string) {
        const data = await this.contract.methods.taskCount().call({ from: fromAddress });

        return parseInt(data, 10);
    }

    async createTask(text: string, fromAddress: string) {
        const tx = await this.contract.methods.createTask(text).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });

        return tx;
    }

    async toggleTaskCompleted(taskId: number, fromAddress: string) {
        const tx = await this.contract.methods.toggleCompleted(taskId).send({
            ...DEFAULT_SEND_OPTIONS,
            from: fromAddress
        });
        return tx;
    }

    async deploy(fromAddress: string) {
        const contract = await (this.contract
            .deploy({
                data: TodoListJSON.bytecode,
                arguments: []
            })
            .send({
                ...DEFAULT_SEND_OPTIONS,
                from: fromAddress,
                to: '0x0000000000000000000000000000000000000000'
            } as any) as any);

        this.useDeployed(contract.contractAddress);
    }

    useDeployed(contractAddress: string) {
        this.address = contractAddress;
        this.contract.options.address = contractAddress;
    }
}
