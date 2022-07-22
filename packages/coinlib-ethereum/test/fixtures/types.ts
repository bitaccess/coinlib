
export type MockReq = {
  method: string,
  params: any[],
}

export type MockRes<R = any> = {
  result: R
}

export type Mock<R = any> = {
  req: MockReq,
  res: MockRes<R>,
}
